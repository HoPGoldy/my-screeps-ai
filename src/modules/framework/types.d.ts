/**
 * 包含任意属性的类
 */
type AnyClass = { [key: string]: any }

/**
 * 诸如 Game.creeps、Game.rooms 之类的哈希对象
 */
type AnyHashMap = { [key: string]: any }

/**
 * 生命周期回调
 */
type AnyCallback = () => any

/**
 * 自定义的 cpu 消耗处理回调
 */
type CostCallback = (costResult: CpuCostResult) => any

type WarpedCallback = (context: CallbackContext) => any

/**
 * on 方法的入参
 */
type OnArg = {
    /**
     * 回调的名称
     */
    name?: string
} & AppLifecycleCallbacks

/**
 * 框架的生命周期回调
 */
interface AppLifecycleCallbacks {
    /**
     * 玩家放下第一个 spawn 时触发
     * 整个应用只会执行一次
     */
    born?: WarpedCallback
    /**
     * 全局重置时触发
     * 全局重置发生在代码提交或运行了一段时间（随机时长）时
     * 该回调执行时原型拓展已经挂载完成
     */
    reset?: WarpedCallback
    /**
     * 在每个 tick 开始时触发
     * 可以在此设置本 tick 需要的数据或者清空过期缓存
     */
    tickStart?: WarpedCallback
    /**
     * 在每个 tick 完成了所有单位的 onWork 任务后触发
     * 可以在此执行自定义的模块
     */
    afterWork?: WarpedCallback
    /**
     * 在所有 afterWork 回调执行完成后触发
     * 可以在此进行本 tick 的数据保存工作
     */
    tickEnd?: WarpedCallback
}

/**
 * 存放声明周期回调的场所
 */
type CallbackStore<T extends WarpedCallback | AnyCallback> = {
    [lifecycleName in keyof AppLifecycleCallbacks]: {
        /**
         * 回调的名称
         */
        context: CallbackContext
        /**
         * 实际的回调
         */
        callback: T
    }[]
}

/**
 * 中间件的上下文
 */
interface CallbackContext {
    /**
     * 在生命周期回调中 - 该回调的名称
     * 若没有在 on 方法里传入，则将自行分配
     */
    name?: string
    /**
     * 在生命周期回调中 - 该回调的类型
     */
    lifecycleType?: keyof AppLifecycleCallbacks
    /**
     * 在游戏对象入口回调中 - 游戏对象实例
     */
    instance?: Room | Structure | Creep | PowerCreep
}

/**
 * 中间件
 * 调用 next 可以执行下一个中间件
 */
type Middleware = (next: () => any, context: CallbackContext) => any

/**
 * 本 tick 的 cpu 使用情况
 * 只包含大体的阶段 cpu 消耗，更细致的消耗（例如不同建筑的消耗）请在对应的回调里自行统计
 */
type CpuCostResult = {
    /**
     * 本 tick 的总消耗
     */
    total: number
    /**
     * 房间 onWork 的消耗
     */
    rooms: GameObjectCpuCost<Room>[]
    /**
     * 建筑 onWork 的消耗
     */
    structures: GameObjectCpuCost<Structure>[]
    /**
     * creep onWork 的消耗
     */
    creeps: GameObjectCpuCost<Creep>[]
    /**
     * pc onWork 的消耗
     */
    powercreeps: GameObjectCpuCost<PowerCreep>[]
    /**
     * 全局重置回调的消耗
     */
    reset: LifecycleCpuCost[]
    /**
     * tickStart 回调的消耗
     */
    tickStart: LifecycleCpuCost[]
    /**
     * afterWork 回调的消耗
     */
    afterWork: LifecycleCpuCost[]
    /**
     * tickEnd 回调的消耗
     */
    tickEnd: LifecycleCpuCost[]
}

/**
 * 生命周期回调的 cpu 消耗
 */
interface LifecycleCpuCost {
    /**
     * 该回调的名称
     * 在 on 方法中设置
     */
    name: string
    /**
     * 该回调的消耗
     */
    cost: number
}

/**
 * 游戏对象的 cpu 消耗
 */
interface GameObjectCpuCost<T> {
    /**
     * 该消耗的使用对象，例如一个房间对象或者建筑对象
     */
    instance: T
    /**
     * 该对象的消耗
     */
    cost: number 
}

/**
 * 创建实例时的入参
 */
interface CreateOptions {
    /**
     * bot 名称
     * 没啥用，会保存在 Memory 中用于确定是否已经触发过 born 阶段
     */
    name?: string
    /**
     * 要添加的生命周期回调
     * 等同于调用 on 方法
     */
    callbacks?: AppLifecycleCallbacks
    /**
     * 原型拓展列表
     * 一个二维数组，包含所有想要进行拓展的原型，第二维元组的含义为：[ 要进行拓展的类，包含拓展属性的类 ]
     * 会对每个挂载对执行 mount 方法
     */
    mountList?: [ AnyClass, AnyClass ][]
}

declare module NodeJS {
    interface Global {
        /**
         * 是否已经完成挂载
         */
        _mountComplete: true
    }
}

interface Memory {
    /**
     * 在 bot 第一次运行时（born 阶段）会添加该 bot
     */
    botTag?: string
}
