/**
 * 原型拓展上的入口方法名
 */
const MOUNT_ENTRY_FUNCTION = 'onWork'

/**
 * 默认的 bot 名称
 */
const DEFAULT_BOT_NAME = 'hopgoldyFramework'

export default class App {
    /**
     * 该 bot 的名称，默认为创建时间
     */
    readonly name: string = DEFAULT_BOT_NAME

    /**
     * 原始原型拓展
     * 和下面回调一样，用于在中间件变更时重新包装拓展的入口方法
     */
    private originMount: [ AnyClass, AnyClass ][] = []

    /**
     * 原始回调
     * 在中间件变更时会使用此处的回调重新包装出下面的 warpedCallback
     */
    private readonly originCallback: CallbackStore<AnyCallback> = {
        born: [], reset: [], tickStart: [], afterWork: [], tickEnd: []
    }

    /**
     * 通过中间件包装过的回调
     */
    private readonly warpedCallback: CallbackStore<WarpedCallback> = {
        born: [], reset: [], tickStart: [], afterWork: [], tickEnd: []
    }

    /**
     * 自定义中间件，将会包裹到所有 callback 和拓展的入口方法上
     */
    private _middlewares: Middleware[] = []

    /**
     * 当前应用的所有中间件
     */
    public get middlewares() {
        const middlewares = [ ...this._middlewares ]
        if (this.middlewareErrorCatch) middlewares.push(this.middlewareErrorCatch)
        if (this._costHandle) middlewares.push(this.middlewareCpuCalc)
        return middlewares
    }

    /**
     * 每个 tick 的 cpu 消耗都会被更新到这里
     * 只在设置了 cost 回调后使用
     */
    private cpuCost: CpuCostResult = {
        total: 0, rooms: [], structures: [], creeps: [], powercreeps: [],
        reset: [], tickStart: [], afterWork: [], tickEnd: []
    }

    /**
     * 创建 Bot 实例
     */
    constructor({ name, callbacks, mountList }: CreateOptions = {}) {
        if (name) this.name = name
        if (callbacks) this.on(callbacks)
        if (mountList) mountList.map(mountGroup => this.mount(...mountGroup))
    }

    /**
     * 实际的 cpu 消耗处理函数
     * 默认不启用
     */
    private _costHandle: CostCallback = undefined

    /**
     * 设置 cpu 消耗结果处理回调
     * 会对内部方法添加性能检测
     */
    public set cost(callback: CostCallback) {
        this._costHandle = callback
        this.wrap()
        this.run = () => {
            const startCpu = Game.cpu.getUsed()

            // 执行实际业务
            this._run()

            // 统计 cpu 并挂上标识
            // callback(startCpu)

            return this
        }
    }

    /**
     * 中间件 - 默认的异常捕获
     */
    private middlewareErrorCatch: Middleware = next => {
        try {
            next()
        }
        catch (e) {
            console.log(e)
        }
    }

    /**
     * 中间件 - cpu 统计
     */
    private middlewareCpuCalc: Middleware = next => {
        const startCpu = Game.cpu.getUsed()
        next()
        const useCpu = Game.cpu.getUsed() - startCpu

        // 保存消耗
        // this.cpuCost.push(Game.cpu.getUsed())
    }

    /**
     * 添加新的中间件
     * @param middleware 新的中间件
     */
    public use(middleware: Middleware): App {
        this._middlewares.unshift(middleware)
        this.wrap()
        return this
    }

    /**
     * 包装中间件
     * 执行该方法将会更新中间件
     */
    private wrap(): void {
        const middlewares = this.middlewares

        // 包装所有生命周期钩子
        for (const callbackName in this.originCallback) {
            this.warpedCallback[callbackName] = this.originCallback[callbackName].map(callbackData => ({
                callback: this.getWarped(callbackData.callback, middlewares),
                context: callbackData.context
            }))
        }

        // 包装所有拓展的入口
        for (const [ Target, Extension ] of this.originMount) {
            if (!Extension.prototype[MOUNT_ENTRY_FUNCTION]) continue
            Target.prototype[MOUNT_ENTRY_FUNCTION] = this.getWarped(Extension.prototype[MOUNT_ENTRY_FUNCTION], middlewares)
        }
    }

    /**
     * 给指定回调包装中间件
     * 
     * @param callback 最终要执行的回调
     * @param middlewares 要添加的中间件，越靠前执行越早
     * @param bindTarget 给最终回调绑定的对象
     * @returns 包装后的回调方法
     */
    private getWarped(callback: AnyCallback, middlewares: Middleware[]): WarpedCallback {
        return middlewares.reduce<WarpedCallback>((pre, current) => {
            return function (context: CallbackContext) { return current.call(this, pre.bind(this), context) }
        }, callback)
    }

    /**
     * 设置生命周期回调
     * 同一生命周期阶段可以设置多次，在执行时会按照设置的顺序依次执行
     * 
     * @param callbacks 要执行的生命周期回调
     */
    public on(callbacks: OnArg): App {
        // 遍历所有回调并保存
        Object.keys(callbacks).map(type => {
            // 创建上下文对象
            const context: CallbackContext = {
                name: callbacks.name || `${type}${this.originCallback[type].length}`,
                lifecycleType: type as keyof AppLifecycleCallbacks
            }
            const warped = this.getWarped(callbacks[type], this.middlewares)

            // 分别保存到原始回调存储和包装后存储
            this.originCallback[type].push({ context, callback: callbacks[type] })
            this.warpedCallback[type].push({ context, callback: warped })
        })
        return this
    }

    /**
     * 挂载原型拓展
     * 
     * @param targetClass 要挂载到的类
     * @param extensionClass 包含拓展的类
     */
    public mount(targetClass: AnyClass, extensionClass: AnyClass): App {
        // 保存原始拓展
        this.originMount.push([ targetClass, extensionClass ])

        // 进行挂载
        Object.getOwnPropertyNames(extensionClass.prototype).map(prop => {
            targetClass.prototype[prop] = extensionClass.prototype[prop]
        })

        // 包装入口方法
        if (extensionClass.prototype[MOUNT_ENTRY_FUNCTION]) {
            targetClass.prototype[MOUNT_ENTRY_FUNCTION] = this.getWarped(
                extensionClass.prototype[MOUNT_ENTRY_FUNCTION],
                this.middlewares
            )
        }
        return this
    }

    /**
     * 运行 bot
     */
    public run = this._run
    
    private _run(): App {
        if (!global._mountComplete) this.onGlobalReset()

        this.execLifecycleCallback('tickStart')

        // 执行主要的 onwork 工作
        this.doing(Game.rooms)
        this.doing(Game.structures)
        this.doing(Game.creeps)
        this.doing(Game.powerCreeps)

        this.execLifecycleCallback('afterWork')
        this.execLifecycleCallback('tickEnd')

        return this
    }

    /**
     * 当全局重置时触发
     */
    private onGlobalReset() {
        // 检查是否是第一次全局重置
        if (!Memory.botTag || Memory.botTag !== this.name) {
            this.execLifecycleCallback('born')
            Memory.botTag = this.name
        }

        this.execLifecycleCallback('reset')
        global._mountComplete = true
    }

    /**
     * 执行指定生命周期阶段回调
     * @param type 要执行的生命周期回调名称
     */
    private execLifecycleCallback(lifecycleType: keyof AppLifecycleCallbacks) {
        // 遍历执行 work
        for (const { context, callback } of this.warpedCallback[lifecycleType]) {
            callback(context)
        }
    }

    /**
     * 执行 Hash Map 中子元素对象的 work 方法
     * 
     * @param hashMap 游戏对象的 hashMap。如 Game.creeps、Game.spawns 等
     * @param costSaveKey 该 hashMap 的 cpu 消耗保存到 this.cpuCost 哪个键下
     */
    private doing(hashMap: AnyHashMap): void {
        // 遍历执行 work
        const allItem = Object.values(hashMap)
        allItem.forEach(item => item[MOUNT_ENTRY_FUNCTION] && item[MOUNT_ENTRY_FUNCTION].call(item, { instance: item }))
    }
}