import { LabTransportType, REACTION_SOURCE } from '../constants'
import { LabAccessor } from '../labAccessor'
import { LabMemoryAccessor } from '../memory'
import { LabContext, LabMemory, LabState } from '../types'

export const useReaction = function (roomName: string, context: LabContext, db: LabMemoryAccessor, labAccessor: LabAccessor) {
    const { env, getMemory, getResourceAmount, hasTransportTask, addTransportTask } = context
    const { getInLabs, getReactionLabs } = labAccessor

    /**
     * 反应流程控制器
     */
    const runReactionWork = function (): void {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)

        // lab 集群被暂停，停止执行合成
        if (memory.pause) return

        if (!memory.reactionState) memory.reactionState = LabState.GetTarget

        switch (memory.reactionState) {
        case LabState.GetTarget:
            if (env.inInterval(10) || getInLabs().length < 2) return
            labGetTarget(room, memory)
            break
        case LabState.GetResource:
            if (env.inInterval(15)) return
            labGetResource(room, memory)
            break
        case LabState.Working:
            if (env.inInterval(2)) return
            labWorking(room, memory)
            break
        case LabState.PutResource:
            if (env.inInterval(15)) return
            labPutResource(room, memory)
            break
        }
    }

    /**
     * lab 阶段：获取反应目标
     */
    const labGetTarget = function (room: Room, memory: LabMemory): void {
        const resource = db.queryCurrentTarget()

        // 目标资源数量已经足够了就不合成
        const existAmount = getResourceAmount(room, resource.target)
        if (existAmount >= resource.number) {
            db.updateIndexToNext()
            return
        }

        // 确认是否可以合成
        const canReactionAmount = getReactionAmount(resource.target, room)
        // 可以合成
        if (canReactionAmount > 0) {
            memory.reactionState = LabState.GetResource

            // 最小的就是目标合成数量
            memory.reactionAmount = Math.min(
                // 单次 lab 能合成的最大值
                LAB_MINERAL_CAPACITY,
                // 家里素材能合成的最大值
                canReactionAmount,
                // 当前距离期望值差了多少
                resource.number - existAmount
            )

            env.log.normal(`指定合成目标：${resource.target} ${memory.reactionAmount}`)
        }
        // 合成不了
        else {
            // env.log.warning(`无法合成 ${resource.target}`)
            db.updateIndexToNext()
        }
    }

    /**
     * 查询目标资源可以合成的数量
     *
     * @param resourceType 要查询的资源类型
     * @returns 可以合成的数量，为 0 代表无法合成
     */
    const getReactionAmount = function (resourceType: ResourceConstant, room: Room): number {
        // 获取资源及其数量
        const needResourcesName = REACTION_SOURCE[resourceType]
        if (!needResourcesName) {
            env.log.warning(`reactionSource 中未定义 ${resourceType}`)
            return 0
        }
        // 将底物按数量从小到大排序
        const needResources = needResourcesName
            .map(res => getResourceAmount(room, res))
            .sort((a, b) => a - b)

        // 根据短板底物计算可合成数量
        // 这里取余了下 LAB_REACTION_AMOUNT 是因为一次反应最少需要这么多底物，多拿了也合不了
        return needResources[0] - (needResources[0] % LAB_REACTION_AMOUNT)
    }

    /**
     * lab 阶段：获取底物
     */
    const labGetResource = function (room: Room, memory: LabMemory): void {
        const inLabs = getInLabs()
        if (inLabs.length < 2) {
            memory.reactionState = LabState.PutResource
            return
        }
        // 检查是否有资源移入任务
        if (hasTransportTask(room, LabTransportType.LabIn)) return

        // 检查 InLab 底物数量，都有底物的话就进入下个阶段
        if (inLabs.every(lab => lab.store[lab.mineralType] >= memory.reactionAmount)) {
            memory.reactionState = LabState.Working
            return
        }

        // 检查存储里的底物数量是否足够
        const targetResource = db.queryCurrentTarget().target
        const hasInsufficientResource = REACTION_SOURCE[targetResource].find(res => {
            return getResourceAmount(room, res) < memory.reactionAmount
        })

        // 有不足的底物, 重新查找目标
        if (hasInsufficientResource) {
            memory.reactionState = LabState.GetTarget
            db.updateIndexToNext()
        }
        // 没有就正常发布底物填充任务
        else getReactionResource(room, memory.reactionAmount)
    }

    /**
     * 获取当前合成需要的底物
     */
    const getReactionResource = function (room: Room, amount: number): void {
        // 获取目标产物
        const targetResource = db.queryCurrentTarget().target
        const inLabs = getInLabs()
        // 获取底物及其数量
        const requests = REACTION_SOURCE[targetResource].map((resourceType, index) => ({
            to: inLabs[index].id,
            resType: resourceType,
            amount
        }))

        // 发布任务
        addTransportTask(room, LabTransportType.LabIn, requests)
    }

    /**
     * lab 阶段：进行反应
     */
    const labWorking = function (room: Room, memory: LabMemory): void {
        const { cooldownTime } = memory
        const inLabs = getInLabs()
        const reactionLabs = getReactionLabs()
        const { time: GameTime } = env.getGame()

        // 还没冷却好
        if (cooldownTime && GameTime < cooldownTime) return

        // inLab 不够了，可能是被借去 boost 了，进入下个阶段
        if (inLabs.length < 2) {
            memory.reactionState = LabState.PutResource
            return
        }

        // 遍历 lab 执行反应
        for (const lab of reactionLabs) {
            const runResult = lab.runReaction(inLabs[0], inLabs[1])

            // 反应成功后等待反应炉冷却
            // 这里需要注意的是，runReaction之后 cooldown 不会立刻出现，而是等到下个 tick 执行反应之后才会出现
            // 所以下面这个 cooldownTime 的计数是在下个 tick 时运行的
            if (runResult === ERR_TIRED) {
                memory.cooldownTime = GameTime + lab.cooldown + 1
                return
            }
            // 底物不足的话就进入下个阶段
            else if (runResult === ERR_NOT_ENOUGH_RESOURCES || runResult === ERR_INVALID_ARGS) {
                memory.reactionState = LabState.PutResource
                return
            }
            else if (runResult !== OK) {
                env.log.error(`runReaction 异常，错误码 ${runResult}`)
            }
        }
    }

    /**
     * lab 阶段：移出产物
     */
    const labPutResource = function (room: Room, memory: LabMemory): void {
        // 检查是否已经有正在执行的移出任务
        if (hasTransportTask(room, LabTransportType.LabOut)) return

        const workLabs = [...getReactionLabs(), ...getInLabs()]
        const needCleanLabs = workLabs.filter(lab => lab.mineralType)

        // 还有没净空的就发布移出任务
        if (needCleanLabs.length > 0) {
            const requrests = needCleanLabs.map(lab => ({
                from: lab.id,
                resType: lab.mineralType
            }))
            addTransportTask(room, LabTransportType.LabOut, requrests)
            return
        }

        // 都移出去的话就可以开始新的轮回了
        memory.reactionState = LabState.GetTarget
        delete memory.reactionAmount
        db.updateIndexToNext()
    }

    return runReactionWork
}
