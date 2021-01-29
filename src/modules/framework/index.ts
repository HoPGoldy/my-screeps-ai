export default class App {
    /**
     * 该 bot 的名称，默认为创建时间
     */
    readonly name: string = 'hopgoldyFramework'

    /**
     * 原始原型拓展
     * 和下面回调一样，用于在中间件变更时重新包装 onWork
     */
    private originMount: [ AnyClass, AnyClass ][]

    /**
     * 原始回调
     * 在中间件变更时会使用此处的回调重新包装出下面的 warpedCallback
     */
    private readonly originCallback: CallbackStore = {
        born: [], reset: [], tickStart: [], afterWork: [], tickEnd: []
    }

    /**
     * 通过中间件包装过的回调
     */
    private readonly warpedCallback: CallbackStore = {
        born: [], reset: [], tickStart: [], afterWork: [], tickEnd: []
    }

    /**
     * 自定义中间件，将会包裹到所有 callback 和拓展的 onWork 方法上
     */
    private middlewares: Middleware[] = []

    /**
     * 每个 tick 的 cpu 消耗都会被更新到这里
     */
    private cpuCost: number[] = []

    /**
     * 创建 Bot 实例
     */
    constructor({ name, callbacks, mountList }: CreateOptions = {}) {
        if (name) this.name = name
        if (callbacks) this.on(callbacks)
        if (mountList) mountList.map(mountGroup => this.mount(...mountGroup))
    }

    /**
     * cpu 消耗处理函数，默认不启用
     */
    private _costHandler: CostCallback = undefined

    /**
     * 设置 cpu 消耗结果处理回调
     * 会对内部方法添加性能检测
     */
    public set cost(callback: CostCallback) {
        this._costHandler = callback
        this.wrap()
        this.run = () => {
            const startCpu = Game.cpu.getUsed()

            // 执行实际业务
            this._run()

            // 统计 cpu 并挂上标识

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
     * 中间件 - cpu 统计包
     */
    private middlewareCpuCalc: Middleware = next => {
        next()
        // 保存消耗
        this.cpuCost.push(Game.cpu.getUsed())
    }

    /**
     * 包装中间件
     * 执行该方法将会更新中间件，
     */
    private wrap(): void {
        const middlewares = [ ...this.middlewares ]
        if (this.middlewareErrorCatch) middlewares.push(this.middlewareErrorCatch)
        if (this.middlewareCpuCalc) middlewares.push(this.middlewareCpuCalc)

        // 包装所有生命周期钩子
        for (const callbackName in this.originCallback) {
            this.warpedCallback[callbackName] = this.originCallback[callbackName].map((callback: AnyCallback) => {
                return this.getWarped(callback, middlewares)
            })
        }

        // 包装所有拓展的 onWork
        for (const [ Target, Extension ] of this.originMount) {
            if (!Extension.prototype.onWork) continue
            Target.prototype.onWork = this.getWarped(Extension.prototype.onWork, middlewares, Target)
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
    private getWarped(callback: AnyCallback, middlewares: Middleware[], bindTarget?: AnyClass): AnyCallback {
        return middlewares.reduce<AnyCallback>((pre, current) => {
            return () => current(pre.bind(bindTarget))
        }, callback)
    }

    /**
     * 设置生命周期回调
     * 同一生命周期阶段可以设置多次，在执行时会按照设置的顺序依次执行
     * 
     * @param callbacks 要执行的生命周期回调
     */
    public on(callbacks: AppLifecycleCallbacks): App {
        // 遍历所有回调并保存
        Object.keys(callbacks).map(callbackName => {
            this.originCallback[callbackName].push(callbacks[callbackName])
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
        Object.getOwnPropertyNames(extensionClass.prototype).map(prop => {
            targetClass.prototype[prop] = extensionClass.prototype[prop]
        })
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
     * @param callbackName 要执行的生命周期回调名称
     */
    private execLifecycleCallback(callbackName: keyof AppLifecycleCallbacks) {
        // 遍历执行 work
        this[callbackName].map(callback => callback())
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
        allItem.forEach(item => item.onWork && item.onWork())
    }
}