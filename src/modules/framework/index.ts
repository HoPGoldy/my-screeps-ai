export default class App {
    /**
     * 该 bot 的名称，默认为创建时间
     */
    readonly name: string = `${Game.time}`

    /**
     * 所有生命周期回调
     * 均支持设置多个，会按照设置的顺序依次执行
     */
    private readonly born: LifecycleCallback[] = []
    private readonly reset: LifecycleCallback[] = []
    private readonly tickStart: LifecycleCallback[] = []
    private readonly afterWork: LifecycleCallback[] = []
    private readonly tickEnd: LifecycleCallback[] = []

    /**
     * 性能结果处理回调
     */
    public cost: CostCallback = undefined

    /**
     * 每个 tick 的 cpu 消耗都会被更新到这里
     */
    private cpuCost: CpuCostResult = {
        total: 0, room: 0, structure: 0, creep: 0, powercreep: 0,
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
        Object.keys(callbacks).map(callbackName => this[callbackName].push(callbacks[callbackName]))
        return this
    }

    /**
     * 将拓展挂载至执行原型
     * 
     * @param targetClass 要挂载到的类
     * @param extensionClass 包含拓展的类
     */
    public mount(targetClass: AnyClass, extensionClass: AnyClass): App {
        targetClass.prototype = extensionClass.prototype
        return this
    }

    /**
     * 运行 bot
     */
    public run(): App {
        if (!global._mountComplete) this.onGlobalReset()

        this.execLifecycleCallback('tickStart')

        // 执行主要的 onwork 工作
        this.doing(Game.rooms, 'rooms')
        this.doing(Game.structures, 'rooms')
        this.doing(Game.creeps, 'rooms')
        this.doing(Game.powerCreeps, 'rooms')

        this.execLifecycleCallback('afterWork')
        this.execLifecycleCallback('tickEnd')

        // 如果有的话执行 cpu 消耗处理回调
        this.cost && this.cost(this.cpuCost)

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
    }

    /**
     * 执行指定生命周期阶段回调
     * @param callbackName 要执行的生命周期回调名称
     */
    private execLifecycleCallback(callbackName: keyof AppLifecycleCallbacks) {
        const baseCpu = Game.cpu.getUsed()

        // 执行回调
        this[callbackName].map(callback => callback())

        // 保存消耗
        const usedCpu = Game.cpu.getUsed() - baseCpu
        if (callbackName in this.cpuCost) this.cpuCost[callbackName] = usedCpu
    }

    /**
     * 执行 Hash Map 中子元素对象的 work 方法
     * 
     * @param hashMap 游戏对象的 hashMap。如 Game.creeps、Game.spawns 等
     * @param costSaveKey 该 hashMap 的 cpu 消耗保存到 this.cpuCost 哪个键下
     */
    private doing(hashMaps: AnyHashMap, costSaveKey: string): void {
        let baseCpu = Game.cpu.getUsed()
   
        // 遍历执行 work
        const allItem = Object.values(hashMaps)
        allItem && allItem[0].onoWork && allItem.forEach(item => item.onWork())

        // 保存消耗
        const usedCpu = Game.cpu.getUsed() - baseCpu
        if (costSaveKey in this.cpuCost) this.cpuCost[costSaveKey] = usedCpu
    }
}