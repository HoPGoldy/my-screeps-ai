export default class App {
    /**
     * 该 bot 的名称，默认为创建时间
     */
    readonly name: string = 'hopgoldyFramework'

    /**
     * 所有生命周期回调
     * 均支持设置多个，会按照设置的顺序依次执行
     */
    private readonly born: LifecycleCallback[] = []
    private readonly reset: LifecycleCallback[] = []
    private readonly tickStart: LifecycleCallback[] = []
    private readonly afterWork: LifecycleCallback[] = []
    private readonly tickEnd: LifecycleCallback[] = []

    private _cost: CostCallback = undefined
    /**
     * 性能结果处理回调
     */
    public set cost(callback: CostCallback) {
        this._cost = callback
        this.run = this.cpuCalcWarpper(this._doing)
        this.doing = this.cpuCalcWarpper(this._doing)
        this.execLifecycleCallback = this.cpuCalcWarpper(this._execLifecycleCallback)
    }

    /**
     * 默认的异常处理器
     */
    private _errorWapper = (callback) => {
        return () => {
            try {
                callback()
            }
            catch (e) {
                console.log(e)
            }
        }
    }

    /**
     * 每个 tick 的 cpu 消耗都会被更新到这里
     */
    private cpuCost: CpuCostResult = {
        total: 0, rooms: 0, structures: 0, creeps: 0, powercreeps: 0,
        reset: 0, tickStart: 0, afterWork: 0, tickEnd: 0
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
     * 设置生命周期回调
     * 同一生命周期阶段可以设置多次，在执行时会按照设置的顺序依次执行
     * 
     * @param callbacks 要执行的生命周期回调
     */
    public on(callbacks: AppLifecycleCallbacks): App {
        // 遍历所有回调并保存
        Object.keys(callbacks).map(callbackName => {
            this[callbackName].push(this._errorWapper(callbacks[callbackName]))
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
        this.doing('rooms')
        this.doing('structures')
        this.doing('creeps')
        this.doing('powerCreeps')

        this.execLifecycleCallback('afterWork')
        this.execLifecycleCallback('tickEnd')

        // 如果有的话执行 cpu 消耗处理回调
        this._cost && this._cost(this.cpuCost)

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

    private execLifecycleCallback = this._execLifecycleCallback

    /**
     * 执行指定生命周期阶段回调
     * @param callbackName 要执行的生命周期回调名称
     */
    private _execLifecycleCallback(callbackName: keyof AppLifecycleCallbacks) {
        // 遍历执行 work
        this[callbackName].map(callback => callback())
    }

    private doing = this._doing

    /**
     * 执行 Hash Map 中子元素对象的 work 方法
     * 
     * @param hashMapName 游戏对象的 hashMap。如 Game.creeps、Game.spawns 等
     * @param costSaveKey 该 hashMap 的 cpu 消耗保存到 this.cpuCost 哪个键下
     */
    private _doing(hashMapName: 'rooms' | 'structures' | 'creeps' | 'powerCreeps'): void {
        // 遍历执行 work
        const allItem = Object.values(Game[hashMapName])
        allItem.forEach(item => item.onWork && item.onWork())
    }

    /**
     * cpu 统计包装器
     * 当设置了 this.cost 后，主要的方法都将会使用该方法进行包装以进行 cpu 统计
     */
    private cpuCalcWarpper(callback: any): any {
        return (name, ...args) => {
            const baseCpu = Game.cpu.getUsed()
            const result = callback.call(this, name, ...args)
            // 保存消耗
            const usedCpu = Game.cpu.getUsed() - baseCpu
            if (name in this.cpuCost) this.cpuCost[name] = usedCpu
            return result
        }
    }
}