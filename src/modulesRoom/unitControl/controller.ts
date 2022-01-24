import { createEnvContext } from '@/utils'
import { RemoveCreepOptions, UnitControlContext, UnitMemory } from './types'

const pad = content => _.padRight((content || '').toString(), 40)

/**
 * 创建角色控制器
 *
 * @generic T 该单位的内存类型
 * @generic C 该单位的运行上下文类型
 */
export const createRoleController = function<T = unknown, C = unknown> (context: UnitControlContext<T, C>) {
    const {
        env = createEnvContext('unitControl'),
        getMemory, onCreepDead, runPrepare, runSource, runTarget, onCreepStageChange
    } = context
    const { green, yellow } = env.colorful

    /**
     * creep 的运行时上下文
     */
    let runtimeContext: C

    /**
     * 添加一个单位
     * 该单位会一直执行创建时赋予的工作
     * 直到死亡后触发 onCreepDead 回调并清空内存
     *
     * @param creep 要添加的新单位
     * @param defaultMemory 该单位的默认内存
     * @param room 该单位要工作在哪个房间（不填则默认为其所在房间）
     */
    const addUnit = function (creep: Creep, defaultMemory?: T, room?: Room) {
        const memory = getMemory(room || creep.room)
        memory[creep.name] = {
            ...(memory[creep.name] || {}),
            ...defaultMemory,
            working: false,
            ready: false
        }

        delete memory[creep.name].registration
    }

    /**
     * 注册一个单位
     * 该方法是 addUnit 的一个特殊版本，用于在 creep 还没孵化完成时提前注册该单位的信息
     *
     * @param creepName 将要到岗的 creep 名字
     * @param defaultMemory creep 的内存
     * @param room 要发布到的房间
     */
    const registerUnit = function (creepName: string, defaultMemory: T, room: Room) {
        const memory = getMemory(room)
        memory[creepName] = {
            ...defaultMemory,
            registration: true,
            working: false,
            ready: false
        }
    }

    /**
     * 移除一个单位
     * 注意：如果配置了立刻杀死的话，死亡 creep 将不会触发 onCreepDead
     */
    const removeUnit = function (room: Room, creepNamePart: string, opts: Partial<RemoveCreepOptions> = {}) {
        const options: RemoveCreepOptions = _.defaults(opts, { batch: false, immediate: false })
        const memory = getMemory(room)

        const removeFunc = (creepName: string) => {
            if (!creepName.includes(creepNamePart)) return false

            if (options.immediate) {
                const creep = env.getCreepByName(creepName)
                creep && creep.suicide()
            }

            if (!memory.registration) delete memory[creepName]

            return true
        }

        const creepNames = Object.keys(memory || {})

        // 如果指定了批量的话就遍历所有 creep
        if (options.batch) creepNames.forEach(removeFunc)
        // 否则只移除匹配到的第一个
        else creepNames.find(removeFunc)
    }

    /**
     * 移除对应房间的所有受控单位
     *
     * @danger 调用该方法相当于对本房间内所有该类型单位执行 removeUnit 方法并立刻杀死
     */
    const removeAll = function (room: Room) {
        const memory = getMemory(room)
        Object.keys(memory || {}).forEach(creepName => {
            delete memory[creepName]
            const creep = env.getCreepByName(creepName)
            if (creep) creep.suicide()
        })
    }

    /**
     * 显示指定房间中受控的 creep 信息
     */
    const show = function (room: Room): string {
        const memory = getMemory(room)
        const allCreepNames = Object.keys(memory)
        if (allCreepNames.length === 0) return '暂无 creep 配置'

        // 将 creep 的配置进行格式化
        const logs: string[] = [
            `当前共有 creep 配置项 ${allCreepNames.length} 个`,
            `${pad('CREEP NAME')}${pad('STATS')}${pad('LIVE')}${pad('IS READY')}${pad('STAGE')}`
        ]

        // 遍历所有配置项并格式化
        logs.push(...allCreepNames.map(creepName => {
            const creep = env.getCreepByName(creepName)
            if (!creep) return `${pad(creepName)}${yellow(pad('未存活'))}`

            return `${pad(creepName)}${green(pad('存活'))}` +
                `${pad(creep.ticksToLive)}${pad(memory[creepName].ready)}${pad(memory[creepName].working)}`
        }))
        return logs.join('\n')
    }

    /**
     * 运行指定单位的生命周期
     */
    const runSingleCreep = function (creep: Creep, memory: UnitMemory<T>, room: Room) {
        // 没准备的时候就执行准备阶段
        if (!memory.ready) {
            // 有准备阶段配置则执行
            if (runPrepare) memory.ready = runPrepare(creep, memory, room, runtimeContext)
            // 没有就直接准备完成
            else memory.ready = true
        }

        // 如果执行了 prepare 还没有 ready，就返回等下个 tick 再执行
        if (!memory.ready) return

        // 获取是否工作，没有 source 的话直接执行 target
        const working = runSource ? memory.working : true

        let stateChange = false
        // 执行对应阶段
        // 阶段执行结果返回 true 就说明需要更换 working 状态
        if (working) {
            if (runTarget && runTarget(creep, memory, room, runtimeContext)) stateChange = true
        }
        else {
            if (runSource && runSource(creep, memory, room, runtimeContext)) stateChange = true
        }

        // 状态变化了就释放工作位置
        if (stateChange) {
            memory.working = !memory.working
            onCreepStageChange && onCreepStageChange(creep, memory.working)
        }
    }

    /**
     * 设置 creep 运行时上下文
     */
    const setRuntimeContext = function (newRuntimeContext: C) {
        runtimeContext = newRuntimeContext
    }

    /**
     * 单位运行入口（应当每 tick 调用该方法）
     * @param room 要运行的房间
     */
    const run = function (room: Room) {
        const memory = getMemory(room)
        for (const creepName in memory) {
            const creep = env.getCreepByName(creepName)
            // 死掉了就处理后事
            // 这里需要额外判断一下，注册单位是“还没到”的单位，不是“死掉”的单位
            if (!creep && !memory.registration) {
                onCreepDead && onCreepDead(creepName, memory[creepName], room, runtimeContext)
                // 这里还要再检查下，因为 onCreepDead 时有可能会重新注册这个爬
                if (!memory.registration) delete memory[creepName]
                continue
            }

            runSingleCreep(creep, memory[creepName], room)
        }
    }

    return { addUnit, registerUnit, removeUnit, removeAll, show, run, setRuntimeContext }
}
