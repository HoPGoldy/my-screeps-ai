import { FactoryContext, FactoryMemory, FactoryTask } from '../types'
import { COMMODITY_MAX, FactoryState, FACTORY_LOCK_AMOUNT, InteractAction, TOP_TARGET } from '../constants'
import { FactoryMemoryAccessor } from '../memory'

/**
 * 包含房间 factory 运维的相关方法
 */
export const useMaintenance = function (roomName: string, context: FactoryContext, db: FactoryMemoryAccessor) {
    const {
        getMemory, getGlobalMemory, env, getFactory, onCanProvideResource, onCantProvideResource,
        getResourceAmount, getRoomShareTask, requestShare
    } = context
    const { yellow, green } = env.colorful

    /**
     * 添加用户指定的特殊目标合成任务
     */
    const addSpecialTargetTask = function (room: Room, memory: FactoryMemory): number {
        // 如果有生产限制的话，会先检查资源底物是否充足
        if (memory.specialTraget in FACTORY_LOCK_AMOUNT) {
            const subResLimit = FACTORY_LOCK_AMOUNT[memory.specialTraget]
            const amount = getResourceAmount(room, subResLimit.sub)
            // 如果对应底物的数量小于需要的数量的话就不会添加新任务
            if (amount < subResLimit.limit) return 0
        }

        // 添加用户指定的新任务
        return memory.taskList.push({
            target: memory.specialTraget,
            amount: 2
        })
    }

    /**
     * 添加新的合成任务
     * 该方法会自行决策应该合成什么顶级产物
     *
     * @param task 如果指定则将其添加为新任务，否则新增顶级产物合成任务
     * @returns 新任务在队列中的位置，第一个为 1
     */
    const addTask = function (task: FactoryTask = undefined): number {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)
        if (task) return memory.taskList.push(task)

        // 如果有用户指定的目标的话就直接生成
        if (memory.specialTraget) return addSpecialTargetTask(room, memory)

        const shareTask = getRoomShareTask(room)
        // 遍历自己内存中的所有生产线类型，从 factoryTopTargets 取出对应的顶级产物，然后展平为一维数组
        const depositTypes = memory.depositTypes || []
        const topTargets = _.flatten(depositTypes.map(type => TOP_TARGET[type][memory.level]))

        // 如果房间有共享任务并且任务目标需要自己生产的话
        if (shareTask && topTargets.includes(shareTask.resourceType as CommodityConstant)) {
            // 将其添加为新任务
            return memory.taskList.push({
                target: shareTask.resourceType as CommodityConstant,
                amount: shareTask.amount
            })
        }

        // 没有共享任务的话就按顺序挑选
        // 索引兜底
        if (!memory.targetIndex || memory.targetIndex >= topTargets.length) {
            memory.targetIndex = 0
        }

        // 获取预定目标
        let topTarget = topTargets[memory.targetIndex]

        // 如果该顶级产物存在并已经超过最大生产上限，则遍历检查是否有未到上限的
        const existAmount = getResourceAmount(room, topTarget)
        if (topTarget in COMMODITY_MAX && existAmount >= COMMODITY_MAX[topTarget]) {
            let targetIndex = 0
            // 修正预定目标
            topTarget = topTargets.find((res, index) => {
                const otherTopAmount = getResourceAmount(room, res)
                if (res in COMMODITY_MAX && otherTopAmount >= COMMODITY_MAX[res]) return false
                else {
                    targetIndex = index
                    return true
                }
            })

            // 遍历了还没找到的话就休眠
            if (!topTarget) {
                gotoBed(100, '达到上限')
                return 0
            }
            // 找到了，按照其索引更新下次预定索引
            else {
                memory.targetIndex = (targetIndex + 1 >= topTargets.length)
                    ? 0
                    : targetIndex + 1
            }
        }
        // 没有到达上限，按原计划更新索引
        else memory.targetIndex = memory.targetIndex + 1 % topTargets.length

        if (!topTarget) return 0
        // 添加任务，一次只合成两个顶级产物
        return memory.taskList.push({
            target: topTarget,
            amount: 2
        })
    }

    /**
     * 处理数量不足的资源
     * 如果该资源自己可以合成的话，就会自动添加新任务
     *
     * @param resType 数量不足的资源
     * @param amount 任务需要的资源总量
     */
    const handleInsufficientResource = function (resType: CommodityConstant, amount: number) {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)
        // 还缺多少
        const lackAmount = amount - getResourceAmount(room, resType)

        // 如果自己的等级无法合成该产品
        if ('level' in COMMODITIES[resType] && COMMODITIES[resType].level !== memory.level) {
            // 请求其他房间共享
            requestShare(room, resType, lackAmount)

            // 如果这时候只有这一个任务了，就进入待机状态
            if (memory.taskList.length <= 1) gotoBed(50, `等待共享 ${resType}*${lackAmount}`)
        }
        // 能合成的话就添加新任务，数量为需要数量 - 已存在数量
        else {
            addTask({ target: resType, amount: lackAmount })
        }
    }

    /**
     * 与外界交互
     * 包含了对 Memory.commodities 和资源共享协议的注册与取消注册
     *
     * @param room 执行交互的房间
     * @param action register 执行注册，unregister 取消注册
     * @param depositTypes 生产线类型，可以为 undefined
     * @param level 工厂等级
     */
    const interactWithOutside = function (room: Room, action: InteractAction, depositTypes: DepositConstant[], level: 1 | 2 | 3 | 4 | 5) {
        const globalMemory = getGlobalMemory()
        // 兜个底
        if (!globalMemory[level]) globalMemory[level] = []

        // 与全局配置项交互
        if (action === InteractAction.Register) globalMemory[level].push(roomName)
        else _.pull(globalMemory[level], roomName);

        // 触发对应的回调
        (depositTypes || []).forEach(type => {
            TOP_TARGET[type][level].forEach(resType => {
                if (action === InteractAction.Register && onCanProvideResource) onCanProvideResource(room, resType)
                else if (onCantProvideResource) onCantProvideResource(room, resType)
            })
        })
    }

    /**
     * 设置工厂等级
     *
     * @param level 等级
     * @returns ERR_INVALID_ARGS 生产线类型异常或者等级小于 1 或者大于 5
     * @returns ERR_NAME_EXISTS 工厂已经被 Power 强化，无法修改等级
     */
    const setLevel = function (level: 1 | 2 | 3 | 4 | 5): OK | ERR_INVALID_ARGS | ERR_NAME_EXISTS {
        // 等级异常就返回错误
        if (level > 5 || level < 1) return ERR_INVALID_ARGS
        const room = env.getRoomByName(roomName)
        const factory = getFactory(room)
        const memory = getMemory(room)

        // 已经被 power 强化并且等级不符，无法设置等级
        if (
            factory.effects &&
            factory.effects[PWR_OPERATE_FACTORY] &&
            (factory.effects[PWR_OPERATE_FACTORY] as PowerEffect).level !== level
        ) return ERR_NAME_EXISTS

        // 如果之前注册过的话，就取消注册
        if (!_.isUndefined(memory.level)) {
            interactWithOutside(room, InteractAction.Unregister, memory.depositTypes, memory.level)
        }

        // 注册新的共享协议
        interactWithOutside(room, InteractAction.Register, memory.depositTypes, level)

        // 更新内存属性
        memory.level = level
        return OK
    }

    /**
     * 获取设置的工厂等级
     * 只要是调用过 setLevel，那这里就可以读到对应的等级值，哪怕工厂还没有经过 power 设置
     */
    const getLevel = function (): 1 | 2 | 3 | 4 | 5 | undefined {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)
        return memory.level
    }

    /**
     * 设置生产线
     * 可以指定多个，会直接覆盖之前的配置，所以需要包含所有要进行的生产线类别
     * @param depositTypes 要生成的生产线类型
     * @returns ERR_INVALID_TARGET 尚未等级工厂等级
     */
    const setChain = function (...depositTypes: DepositConstant[]): ERR_INVALID_TARGET | OK {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)
        if (!memory.level) return ERR_INVALID_TARGET

        // 移除老的注册
        interactWithOutside(room, InteractAction.Unregister, memory.depositTypes, memory.level)
        // 进行新的注册
        interactWithOutside(room, InteractAction.Register, depositTypes, memory.level)

        memory.depositTypes = depositTypes
        return OK
    }

    /**
     * 输出当前工厂的状态
     */
    const show = function (): string {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)
        if (Object.keys(memory).length <= 0) return `[${roomName} factory] 工厂未启用`

        const workStats = memory.pause
            ? yellow('[暂停中]')
            : memory.sleep ? yellow(`[${memory.sleepReason} 休眠中 剩余${memory.sleep - Game.time}t]`) : green('工作中')

        // 自己加入的生产线
        const joinedChain = memory.depositTypes ? memory.depositTypes.join(', ') : '未指定'

        // 工厂基本信息
        const logs = [
            `生产线类型: ${joinedChain} 工厂等级: ${memory.level || '未指定'} ${memory.specialTraget ? '持续生产：' + memory.specialTraget : ''}`,
            `生产状态: ${workStats} 当前工作阶段: ${memory.state}`,
            `现存任务数量: ${memory.taskList.length} 任务队列详情:`
        ]

        // 工厂任务队列详情
        if (memory.taskList.length <= 0) logs.push('无任务')
        else logs.push(...memory.taskList.map((task, index) => `  - [任务 ${index}] 任务目标: ${task.target} 任务数量: ${task.amount}`))

        // 组装返回
        return logs.join('\n')
    }

    /**
     * 进入待机状态
     *
     * @param time 待机的时长
     * @param reason 待机的理由
     */
    const gotoBed = function (time: number, reason: string) {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)

        memory.sleep = Game.time + time
        memory.sleepReason = reason
        return OK
    }

    /**
     * 从休眠中唤醒
     * 注意，休眠（gotoBad / wakeup）和暂停（off / on）是两套逻辑，互不影响
     */
    const wakeup = function () {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)

        delete memory.sleep
        delete memory.sleepReason
    }

    /**
     * 指定唯一生产目标
     *
     * @param target 要生产的目标
     * @param clear 是否同时清理工厂之前的合成任务
     */
    const setSingleTarget = function (target: CommodityConstant, clear = true) {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)

        memory.specialTraget = target
        // 让工厂从暂停中恢复
        delete memory.pause
        // 清理残留任务
        if (clear) db.clearTask()
    }

    /**
     * 清除 setSingleTarget 设置的特定目标
     * 如果之前设置过工厂状态的话（setlevel），将会恢复到对应的自动生产状态
     */
    const clearSingleTarget = function () {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)

        delete memory.specialTraget
    }

    /**
     * 移除当前工厂配置
     * 工厂将进入闲置状态并净空存储
     */
    const remove = function (): OK | ERR_NOT_FOUND {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)
        if (!memory) return ERR_NOT_FOUND

        // 进入废弃进程
        memory.remove = true
        // 置为移出资源阶段
        memory.state = FactoryState.PutResource

        // 移除队列中的后续任务
        if (!memory.taskList) return OK
        memory.taskList = [memory.taskList[0]]
        return OK
    }

    /**
     * 无限期暂停 factory 所有作业
     */
    const off = function () {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)
        memory.pause = true
    }

    /**
     * 重启由 off 方法暂停的 factory 作业
     */
    const on = function () {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)
        delete memory.pause
        wakeup()
    }

    /**
     * 当前 factory 是否正在工作
     */
    const isRunning = function () {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)

        if (Object.keys(memory).length <= 0) return false
        return memory.pause === undefined
    }

    return {
        addTask, handleInsufficientResource, setLevel, getLevel, setChain, show, gotoBed, wakeup, remove,
        setSingleTarget, clearSingleTarget, off, on, isRunning
    }
}

export type MaintenanceContext = ReturnType<typeof useMaintenance>
