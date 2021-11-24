/**
 * 生命周期回调
 */
type AnyCallback = () => unknown

/**
 * 框架的生命周期回调
 */
export interface AppLifecycleCallbacks {
    /**
     * 玩家放下第一个 spawn 时触发，整个应用只会执行一次
     * 会在所有 reset 回调完成后执行（防止出现有依赖还没准备好的问题出现）
     */
    born?: AnyCallback
    /**
     * 在每个 tick 开始时触发
     * 可以在此设置本 tick 需要的数据或者清空过期缓存
     */
    tickStart?: AnyCallback
    /**
     * 在所有 afterWork 回调执行完成后触发
     * 可以在此进行本 tick 的数据保存工作
     */
    tickEnd?: AnyCallback
}

/**
 * 存放声明周期回调的场所
 */
export type CallbackStore = {
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
export type ErrorCatcher = <T extends (...args: unknown[]) => unknown>(next: T, ...args: unknown[]) => void

/**
 * 内存缓存方法
 * 调用 next 可以执行实际业务逻辑
 */
export type MemoryCacher = (next: () => unknown) => unknown

/**
 * 创建实例时的入参
 */
export interface CreateOptions {
    /**
     * bot 名称
     * 没啥用，会保存在 Memory 中用于确定是否已经触发过 born 阶段
     */
    name: string
}
