/**
 * 原型拓展上的入口方法名
 */
const MOUNT_ENTRY_FUNCTION = 'onWork'

/**
 * bot 名称的后缀，会加到指定的名称后
 * 防止不小心覆盖 Memory 的关键字段
 */
const BOT_NAME_SUFFIX = 'Framework'

/**
 * 默认的 bot 名称
 */
const DEFAULT_BOT_NAME = `hopgoldy${BOT_NAME_SUFFIX}`

export default class App {
    /**
     * 该 bot 的名称
     */
    public readonly name: string = DEFAULT_BOT_NAME

    /**
     * 通过中间件包装过的回调
     */
    private readonly lifecycleCallbacks: CallbackStore = {
        born: [], reset: [], tickStart: [], afterWork: [], tickEnd: []
    }

    /**
     * 用于标识下个 on 所注册回调的索引
     * 会在 on 执行后自增
     */
    private callbackIndex: number = 0

    /**
     * 创建 Bot 实例
     * 
     * @param opt 配置项，包含 bot 的名字和要挂载的原型列表
     */
    constructor({ name, mountList }: CreateOptions = {}) {
        if (name) this.name = name + BOT_NAME_SUFFIX
        if (mountList) mountList.map(group => this.mount(...group))
    }

    /**
     * 默认的 Memory 缓存存放处
     */
    private _cachedMemory: Memory

    /**
     * 默认的内存缓存器
     * 来源 @see https://screeps.slack.com/files/U33SKDU0P/F5GKDBBAA/Memory_Cache.js?origin_team=T0HJCPP9T&origin_channel=C2G22RFPF
     */
    private _memoryCacher: MemoryCacher = next => {
        if (this._cachedMemory) {
            delete global.Memory;
            global.Memory = this._cachedMemory
        } else {
            this._cachedMemory = Memory
        }

        next()

        RawMemory.set(JSON.stringify(global.Memory))
    }

    /**
     * 设置新的内存缓存器
     * 设置为空则不使用内存缓存
     * 
     * @danger 请务必执行 next 方法！不然框架将无法正常使用
     */
    set memoryCacher(newCatcher: MemoryCacher) {
        this._memoryCacher = newCatcher
    }

    /**
     * 默认的异常捕获
     */
    private _catcher: ErrorCatcher = next => {
        try {
            next()
        }
        catch (e) {
            console.log(`<span style="color:#ef9a9a">${e}</sapn>`)
            Game.notify(e)
        }
    }

    /**
     * 设置新的异常捕获器
     * 不允许设置为空
     * 
     * @danger 请务必执行 next 方法！不然框架将无法正常使用
     */
    set catcher(newCatcher: ErrorCatcher) {
        if (!newCatcher) return
        this._catcher = newCatcher
    }

    /**
     * 设置生命周期回调
     * 同一生命周期阶段可以设置多次，在执行时会按照设置的顺序依次执行
     * 
     * @param callbacks 要执行的生命周期回调
     * @returns 该组回调的唯一索引，用于取消监听
     */
    public on(callbacks: AppLifecycleCallbacks): number {
        const id = this.getCallbackIndex()
        // 保存所有回调并分配唯一索引（不同分组间唯一）
        Object.keys(callbacks).map(type => {
            this.lifecycleCallbacks[type].push({ id, callback: callbacks[type] })
        })
        return id
    }

    /**
     * 关闭生命周期回调监听
     * 
     * @param index 要取消监听的分组索引
     */
    public close(deleteTarget: number): App {
        // 遍历所有的回调
        Object.values(this.lifecycleCallbacks).map(callbackList => {
            // 查找每个阶段，找到对应的 id 并删除
            callbackList.find(({ id }, index) => {
                if (id !== deleteTarget) return

                callbackList.splice(index, 1)
                return true
            })
        })

        return this
    }

    /**
     * 获取唯一的索引
     */
    public getCallbackIndex(): number {
        return this.callbackIndex ++
    }

    /**
     * 挂载原型拓展
     * 
     * @param targetClass 要挂载到的类
     * @param extensionClass 包含拓展的类
     */
    public mount(targetClass: AnyClass, extensionClass: AnyClass): App {
        // 进行挂载
        Object.getOwnPropertyNames(extensionClass.prototype).map(prop => {
            targetClass.prototype[prop] = extensionClass.prototype[prop]
        })
        return this
    }

    /**
     * 运行 bot
     */
    public run(): App {
        // 有内存缓存的话就包裹一下，否则就直接运行
        if (this._memoryCacher) this._memoryCacher(this._run.bind(this))
        else this._run()

        return this
    }

    /**
     * 实际的框架工作
     */
    private _run() {
        if (!global._mountComplete) this.onGlobalReset()

        this.execLifecycleCallback('tickStart')

        // 执行主要的 onwork 工作
        this.do(Game.rooms)
        this.do(Game.structures, false)
        this.do(Game.creeps)
        this.do(Game.powerCreeps)

        this.execLifecycleCallback('afterWork')
        this.execLifecycleCallback('tickEnd')
    }

    /**
     * 当全局重置时触发
     */
    private onGlobalReset() {
        this.execLifecycleCallback('reset')
        global._mountComplete = true

        // 检查是否是第一次全局重置
        if (!Memory[this.name]) {
            this.execLifecycleCallback('born')
            Memory[this.name] = true
        }
    }

    /**
     * 执行指定生命周期阶段回调
     * @param type 要执行的生命周期回调名称
     */
    private execLifecycleCallback(lifecycleType: keyof AppLifecycleCallbacks) {
        // 遍历执行 work
        for (const { callback } of this.lifecycleCallbacks[lifecycleType]) {
            this._catcher(callback)
        }
    }

    /**
     * 执行 Hash Map 中子元素对象的 work 方法
     * 
     * @param hashMap 游戏对象的 hashMap。如 Game.creeps、Game.spawns 等
     * @param outCheck 入口方法的检查位置，例如 Game.rooms，由于原型都是 Room，所以可以先检查然后再遍历 room 执行，
     * 而 Game.structures，由于有很多不同的原型，所以只能在遍历时针对每个对象进行检查
     */
    private do(hashMap: AnyHashMap, outCheck: boolean = true): void {
        // 遍历执行 work
        const allItem = Object.values(hashMap)
        if (outCheck) {
            // 如果没有入口方法的话，就直接不执行遍历
            if (!allItem[0] || !allItem[0][MOUNT_ENTRY_FUNCTION]) return
            allItem.forEach(item => this.doWithCatcher(item))
        }
        else {
            // 遍历每个对象并检查其入口方法后再执行
            allItem.forEach(item => item[MOUNT_ENTRY_FUNCTION] && this.doWithCatcher(item))
        }
    }

    /**
     * 在异常捕获下执行对象的入口方法
     * @param gameItem 要调用入口方法的游戏对象
     */
    private doWithCatcher(gameItem): void {
        this._catcher(gameItem[MOUNT_ENTRY_FUNCTION].bind(gameItem))
    }
}