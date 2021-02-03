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
 * 框架的生命周期回调
 */
interface AppLifecycleCallbacks {
    /**
     * 玩家放下第一个 spawn 时触发，整个应用只会执行一次
     * 会在所有 reset 回调完成后执行（防止出现有依赖还没准备好的问题出现）
     */
    born?: AnyCallback
    /**
     * 全局重置时触发
     * 全局重置发生在代码提交或运行了一段时间（随机时长）时
     * 该回调执行时原型拓展已经挂载完成
     */
    reset?: AnyCallback
    /**
     * 在每个 tick 开始时触发
     * 可以在此设置本 tick 需要的数据或者清空过期缓存
     */
    tickStart?: AnyCallback
    /**
     * 在每个 tick 完成了所有单位的 onWork 任务后触发
     * 可以在此执行自定义的模块
     */
    afterWork?: AnyCallback
    /**
     * 在所有 afterWork 回调执行完成后触发
     * 可以在此进行本 tick 的数据保存工作
     */
    tickEnd?: AnyCallback
}

/**
 * 存放声明周期回调的场所
 */
type CallbackStore = {
    [lifecycleName in keyof AppLifecycleCallbacks]: {
        /**
         * 该回调对应的唯一标识符，用于在取消挂载时识别
         */
        id: number
        /**
         * 实际的回调函数
         */
        callback: AnyCallback
    }[]
}

/**
 * 异常捕获方法
 * 调用 next 可以执行实际业务逻辑
 */
type ErrorCatcher = (next: () => any) => any

declare module NodeJS {
    interface Global {
        /**
         * 是否已经完成挂载
         */
        _mountComplete: true
    }
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
     * 原型拓展列表
     * 一个二维数组，包含所有想要进行拓展的原型，第二维的元组含义为：[ 目标类，拓展类 ]
     * 会对每个元组执行 mount 方法
     */
    mountList?: [ AnyClass, AnyClass ][]
}