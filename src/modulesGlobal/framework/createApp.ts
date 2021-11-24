import { AppLifecycleCallbacks, CallbackStore, CreateOptions, MemoryCacher } from './types'
import { errorMapper } from './errorMapper'

/**
 * bot 名称的后缀，会加到指定的名称后
 * 防止不小心覆盖 Memory 的关键字段
 */
const BOT_NAME_SUFFIX = 'Framework'

const DEFAULT_OPTIONS: CreateOptions = {
    name: `hopgoldy${BOT_NAME_SUFFIX}`
}

export const createApp = function (opt: Partial<CreateOptions> = {}) {
    const createOptions = { ...DEFAULT_OPTIONS, ...opt }

    /**
     * 通过中间件包装过的回调
     */
    const lifecycleCallbacks: CallbackStore = {
        born: [], tickStart: [], tickEnd: []
    }

    /**
     * 用于标识下个 on 所注册回调的索引
     * 会在 on 执行后自增
     */
    let callbackIndex = 0

    /**
     * 默认的 Memory 缓存存放处
     */
    let _cachedMemory: Memory

    /**
     * 默认的内存缓存器
     * 来源 @see https://screeps.slack.com/files/U33SKDU0P/F5GKDBBAA/Memory_Cache.js?origin_team=T0HJCPP9T&origin_channel=C2G22RFPF
     */
    let _memoryCacher: MemoryCacher = next => {
        if (_cachedMemory) {
            // @ts-ignore
            delete global.Memory
            // @ts-ignore
            global.Memory = _cachedMemory
        }
        else {
            _cachedMemory = Memory
        }

        next()

        // @ts-ignore
        RawMemory.set(JSON.stringify(global.Memory))
    }

    /**
     * 设置新的内存缓存器
     * 设置为空则不使用内存缓存
     *
     * @danger 请务必执行 next 方法！不然框架将无法正常使用
     */
    const setMemoryCacher = function (newCatcher: MemoryCacher) {
        _memoryCacher = newCatcher
    }

    /**
     * 设置生命周期回调
     * 同一生命周期阶段可以设置多次，在执行时会按照设置的顺序依次执行
     *
     * @param callbacks 要执行的生命周期回调
     * @returns 该组回调的唯一索引，用于取消监听
     */
    const on = function (callbacks: AppLifecycleCallbacks): number {
        const id = getCallbackIndex()
        // 保存所有回调并分配唯一索引（不同分组间唯一）
        Object.keys(callbacks).forEach(type => {
            lifecycleCallbacks[type].push({ id, callback: callbacks[type] })
        })
        return id
    }

    /**
     * 关闭生命周期回调监听
     *
     * @param index 要取消监听的分组索引
     */
    const close = function (deleteTarget: number) {
        // 遍历所有的回调
        Object.values(lifecycleCallbacks).forEach(callbackList => {
            // 查找每个阶段，找到对应的 id 并删除
            const index = callbackList.findIndex(({ id }) => id === deleteTarget)
            callbackList.splice(index, 1)
        })
    }

    /**
     * 获取唯一的索引
     */
    const getCallbackIndex = function (): number {
        return callbackIndex++
    }

    let roomRunner: (room: Room) => unknown

    /**
     * 设置房间运行器
     */
    const setRoomRunner = function (newRunner: typeof roomRunner): void {
        roomRunner = newRunner
    }

    let creepRunner: (creep: Creep) => unknown

    /**
     * 设置 creep 运行器
     */
    const setCreepRunner = function (newRunner: typeof creepRunner): void {
        creepRunner = newRunner
    }

    let powerCreepRunner: (creep: PowerCreep) => unknown

    /**
     * 设置 pc 运行器
     */
    const setPowerCreepRunner = function (newRunner: typeof powerCreepRunner): void {
        powerCreepRunner = newRunner
    }

    /**
     * 运行 bot
     */
    const run = function (): void {
        // 有内存缓存的话就包裹一下，否则就直接运行
        if (_memoryCacher) _memoryCacher(_run)
        else _run()
    }

    /**
     * 实际的框架工作
     */
    const _run = function (): void {
        // 检查是否是第一次全局重置
        if (!Memory[createOptions.name]) {
            execLifecycleCallback('born')
            Memory[createOptions.name] = true
        }

        execLifecycleCallback('tickStart')

        if (roomRunner) Object.values(Game.rooms).map(room => errorMapper(roomRunner, room))
        if (creepRunner) Object.values(Game.creeps).map(creep => errorMapper(creepRunner, creep))
        if (powerCreepRunner) Object.values(Game.powerCreeps).map(creep => errorMapper(powerCreepRunner, creep))

        execLifecycleCallback('tickEnd')
    }

    /**
     * 执行指定生命周期阶段回调
     *
     * @param type 要执行的生命周期回调名称
     */
    const execLifecycleCallback = function (lifecycleType: keyof AppLifecycleCallbacks) {
        for (const { callback } of lifecycleCallbacks[lifecycleType]) {
            errorMapper(callback)
        }
    }

    return { setMemoryCacher, on, close, setRoomRunner, setCreepRunner, setPowerCreepRunner, run }
}
