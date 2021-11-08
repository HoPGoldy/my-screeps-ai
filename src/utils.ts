/**
 * 判断一个位置是否在房间入口处（是否骑墙）
 */
export const onEdge = function (pos: RoomPosition): boolean {
    return pos.x === 0 || pos.x === 49 || pos.y === 0 || pos.y === 49
}

/**
* 获取指定方向的相反方向
* 
* @param direction 目标方向
*/
export const getOppositeDirection = function (direction: DirectionConstant): DirectionConstant {
   return <DirectionConstant>((direction + 3) % 8 + 1)
}

/**
 * 将指定位置序列化为字符串
 * 形如: 12/32/E1N2
 * 
 * @param pos 要进行压缩的位置
 */
export const serializePos = function (pos: RoomPosition): string {
    return `${pos.x}/${pos.y}/${pos.roomName}`
}

/**
 * 将位置序列化字符串转换为位置
 * 位置序列化字符串形如: 12/32/E1N2
 * 
 * @param posStr 要进行转换的字符串
 */
export const unserializePos = function (posStr: string): RoomPosition | undefined {
    // 形如 ["12", "32", "E1N2"]
    const [x, y, roomName] = posStr.split('/')

    if (!roomName) return undefined
    return new RoomPosition(Number(x), Number(y), roomName)
}

/**
 * 全局喊话
 */
export const globalSay = function (words: string[]) {
    if (!Memory.sayIndex) Memory.sayIndex = 0

    Object.values(Game.creeps).forEach(creep => creep.say(words[Memory.sayIndex], true))
    Memory.sayIndex = Memory.sayIndex + 1 >= words.length ? 0 : Memory.sayIndex + 1
}

declare global {
    interface Memory {
        /**
         * 全局的喊话索引
         */
        sayIndex?: number
    }
}

/**
 * 获取全局唯一索引
 */
export const getUniqueKey = function (): number {
    return Game._uniqueKey = Game._uniqueKey ? Game._uniqueKey + 0.1 : Game.time
}

declare global {
    interface Game {
        /**
         * 本 tick 使用过的唯一索引
         */
        _uniqueKey?: number
    }
}

/**
 * 移除过期的 flag 内存
 */
export const clearFlag = function (): string {
    let logs = [ '已清理过期旗帜:' ]
    for (const flagName in Memory.flags) {
        if (!Game.flags[flagName]) {
            delete Memory.flags[flagName]
            logs.push(flagName)
        }
    }

    return logs.join(' ')
}

/**
 * 判断是否为白名单玩家
 * 
 * @param creep 要检查的 creep
 * @returns 是否为白名单玩家
 */
export const whiteListFilter = function (creep) {
    if (!Memory.whiteList) return true
    // 加入白名单的玩家单位不会被攻击，但是会被记录
    if (creep.owner.username in Memory.whiteList) {
        Memory.whiteList[creep.owner.username] += 1
        return false
    }

    return true
}

/**
 * 搓 pixel 的框架插件
 */
export const generatePixelAppPlugin: AppLifecycleCallbacks = {
    tickEnd: () => {
        if (Game.cpu.bucket >= 10000 && Game.cpu.generatePixel) Game.cpu.generatePixel()
    }
}

/**
 * 获取一些格式固定，但是在多处调用的名字
 * 便于维护
 */
export const getName = {
    flagBaseCenter: (roomName: string): string => `${roomName} center`
}

/**
 * 给指定对象设置访问器
 * 
 * @param target 要设置访问器的对象
 * @param name 访问器的名字
 * @param getter 访问器方法
 */
export const createGetter = function (target: AnyObject, name: string, getter: () => any) {
    Object.defineProperty(target.prototype, name, {
        get: getter,
        enumerable: false,
        configurable: true
    })
}

/**
 * 在指定房间显示 cost
 * 
 * @param cost 要显示的 cost
 * @param room 要显示到的房间
 */
export const showCost = function (cost: CostMatrix, room: Room): void {
    for (let x = 1; x < 49; x ++) for (let y = 1; y < 49; y ++) {
        room.visual.text(cost.get(x, y).toString(), x, y, {
            color: '#a9b7c6',
            font: 0.5,
            opacity: 0.7
        })
    }
}

/**
 * 获取指定对象并缓存
 * 会将初始化回调的返回值进行缓存，该返回值 **必须拥有 id 字段**
 * 
 * @param initValue 初始化该值的回调，在没有找到缓存 id 时将会调用该方法获取要缓存的初始值
 * @param cachePlace id 存放的对象，一般位于 xxx.memory 上
 * @param cacheKey 要缓存到的键，例如 targetId 之类的字符串
 */
export const useCache = function <T extends ObjectWithId>(initValue: () => T, cachePlace: AnyObject, cacheKey: string): T {
    const cacheId = cachePlace[cacheKey]
    let target: T = undefined

    // 如果有缓存了，就读取缓存
    if (cacheId) {
        target = Game.getObjectById(cacheId)
        if (target) return target

        // 缓存失效了，移除缓存 id，下面会重新搜索
        delete cachePlace[cacheKey]
    }

    // 还没有缓存或者缓存失效了，重新获取并缓存
    target = initValue()
    if (target) cachePlace[cacheKey] = target.id

    return target
}

/**
 * 数组交叉合并
 */
export const crossMerge = function<T = any> (a: T[], b: T[]): T[] {
    return Array.from({ length: a.length + b.length }, (_, index) => {
        return (index % 2 ? b.shift() : a.shift()) || a.shift() || b.shift()
    })
}

interface CreateCacheOptions<T extends (...args: any[]) => any> {
    /**
     * 获取缓存的 key
     * 入参和 callback 相同，返回一个字符串或者数字，不填则使用 callback 第一个参数作为键
     */
    getCacheKey?: (...args: Parameters<T>) => string | number,
    /**
     * 是否可以重用
     * 会在发现缓存后调用，传入缓存的值和本次查询的参数，返回 boolean，为 true 时代表可以继续使用缓存
     */
    shouldReuse?: (reuseResult: ReturnType<T>, ...args: Parameters<T>) => boolean
}

/**
 * 创建缓存
 * 当 callback 第一个参数不为数字、字符串时需务必指定 getCacheKey！
 * 
 * @param callback 要缓存返回值的函数
 */
export const createCache = function <T extends (...args: any[]) => any>(
    callback: T,
    opt: CreateCacheOptions<T> = {}
): [T, () => void, (key: string| number) => void] {
    let cacheStorage: { [key: string]: ReturnType<T> } = {}

    /**
     * 添加了缓存功能的 callback 函数
     */
    const get = function (...args) {
        // 找到缓存的键
        const cacheKey = opt.getCacheKey ? opt.getCacheKey(...args as Parameters<T>) : args[0]
        if (cacheKey in cacheStorage) {
            const cacheData = cacheStorage[cacheKey]
            // 检查一下是否可以重用这个缓存
            const keepReuse = opt.shouldReuse ? opt.shouldReuse(cacheData, ...args as Parameters<T>) : true
            if (keepReuse) return cacheStorage[cacheKey]
        }
        return cacheStorage[cacheKey] = callback(...args as Parameters<T>)
    } as T

    /**
     * 删除所有缓存
     */
    const refresh = function () {
        cacheStorage = {}
    }

    /**
     * 删除指定缓存
     */
    const drop = function (key: string | number) {
        delete cacheStorage[key]
    }

    return [get, refresh, drop]
}

/**
 * 将 array 转换为 kv 形式
 */
export const arrayToObject = function <T>(array: [string, T][]): { [key: string]: T } {
    return array.reduce((result, [key, process]) => {
        result[key] = process
        return result
    }, {})
}

type ObjectWithRun = {
    run: () => void
    showState: () => string
}

/**
 * 创建共享上下文
 * 类似于 react 的 createContext
 * 
 * @param defaultValue 默认值
 */
export const createContext = function <T>(defaultValue?: T) {
    let context = defaultValue

    /**
     * 使用上下文
     */
    const use = function () {
        if (!context) throw new Error('未提供 context！请先调用 context.provide()')
        return context
    }

    /**
     * 提供上下文
     */
    const provide = function(value: T) {
        context = value
    }

    return { use, provide }
}

export const createCluster = function <T extends ObjectWithRun>(
    getInitial?: () => { [key: string]: T }
) {
    let cluster: { [key: string]: T } = getInitial ? getInitial() : {}

    const add = function (key: string, process: T): void {
        cluster[key] = process
    }

    const remove = function (key: string) {
        delete cluster[key]
    }

    const get = function (key: string): T | undefined {
        return cluster[key]
    }

    const run = function () {
        Object.values(cluster).map(process => process.run())
    }

    const map = function <R>(func: (process: T, name: string) => R) {
        return Object.entries(cluster).map(([key, process]) => func(process, key))
    }

    const showState = function () {
        return Object.values(cluster).map(process => process.showState())
    }

    const clear = function () {
        cluster = {}
    }

    return { add, get, run, map, remove, clear, showState }
}

/**
 * 计算身体孵化要消耗的能量
 * 
 * @param bodys 要计算的身体数组
 * @returns 孵化要消耗的数量
 */
export const getBodySpawnEnergy = function (bodys: BodyPartConstant[]): number {
    return bodys.reduce((cost, body) => cost + BODYPART_COST[body], 0)
}

/**
 * 创建坐标值数组
 * 一般用于范围计算时获取周围的 x, y 轴坐标
 * 例如 center=30, range=2，会返回 [28, 29, 30, 31, 32]
 * 
 * @param center 中心点的坐标值
 * @param range 左右延申的范围
 * @returns 以 center 为中心，已 range 为范围的坐标值数组
 */
export const getRangeIndex = function (center: number, range: number) {
    const indexs = Array.from({ length: range * 2 + 1 }).map((_, index) => center - range + index)
    return indexs.filter(index => index >= 0 && index <= 49)
}

/**
 * 游戏中 CostMatrix 的升级版
 * 游戏里的 CostMatrix 只能存放 0 - 255 的数字，无法满足复杂场景下的使用需求
 * 所以就诞生了这个东西，可以存放任意类型的值
 */
export interface RoomTileMap<T> {
    set: (x: number, y: number, value: T) => void
    get: (x: number, y: number) => T
    map: <R>(callback: (x: number, y: number, value: T) => R) => R[][]
    clone: () => RoomTileMap<T>
}

/**
 * 创建 RoomTileMap
 */
export const createTileMap = function <T = true>(initialCallback?: (x: number, y: number) => T): RoomTileMap<T> {
    let data: T[][]

    // 没有初始化函数的话就默认填充为 true
    if (initialCallback) {
        data = Array.from({ length: 50 }).map((_, x) => {
            return Array.from({ length: 50 }).map((_, y) => {
                return initialCallback(x, y)
            })
        })
    }
    else {
        data = Array(50).fill(Array(50).fill(true))
    }

    const set = function (x: number, y: number, value: T) {
        data[x][y] = value
    }

    const get = function (x: number, y: number): T {
        try {
            return data[x][y]
        }
        catch (e) {
            console.log(e)
            console.log(x, y, data[x])
        }
    }

    const map = function <R>(callback: (x: number, y: number, value: T) => R): R[][] {
        return Array.from({ length: 50 }).map((_, x) => {
            return Array.from({ length: 50 }).map((_, y) => {
                return callback(x, y, data[x][y])
            })
        })
    }

    const clone = function (): RoomTileMap<T> {
        return createTileMap((x, y) => data[x][y])
    }

    return { set, get, map, clone }
}