/**
 * 判断一个位置是否在房间入口处（是否骑墙）
 */
export const onEnter = function(pos: RoomPosition): boolean {
    return pos.x === 0 || pos.x === 49 || pos.y === 0 || pos.y === 49
}

/**
 * 获取指定方向的相反方向
 *
 * @param direction 目标方向
 */
export const getOppositeDirection = function(
    direction: DirectionConstant
): DirectionConstant {
    return <DirectionConstant>(((direction + 3) % 8) + 1)
}

/**
 * 将指定位置序列化为字符串
 * 形如: 12/32/E1N2
 *
 * @param pos 要进行压缩的位置
 */
export const serializePos = function(pos: RoomPosition): string {
    return `${pos.x}/${pos.y}/${pos.roomName}`
}

/**
 * 将位置序列化字符串转换为位置
 * 位置序列化字符串形如: 12/32/E1N2
 *
 * @param posStr 要进行转换的字符串
 */
export const unserializePos = function(
    posStr: string
): RoomPosition | undefined {
    // 形如 ["12", "32", "E1N2"]
    const [x, y, roomName] = posStr.split('/')

    if (!roomName) return undefined
    return new RoomPosition(Number(x), Number(y), roomName)
}

/**
 * 全局喊话
 */
export const globalSay = function(words: string[]) {
    if (!Memory.sayIndex) Memory.sayIndex = 0

    Object.values(Game.creeps).forEach((creep) =>
        creep.say(words[Memory.sayIndex], true)
    )
    Memory.sayIndex =
        Memory.sayIndex + 1 >= words.length ? 0 : Memory.sayIndex + 1
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
export const getUniqueKey = function(): number {
    return (Game._uniqueKey = Game._uniqueKey
        ? Game._uniqueKey + 0.1
        : Game.time)
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
export const clearFlag = function(): string {
    let logs = ['已清理过期旗帜:']
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
export const whiteListFilter = function(creep) {
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
        if (Game.cpu.bucket >= 10000 && Game.cpu.generatePixel)
            Game.cpu.generatePixel()
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
export const createGetter = function(
    target: AnyObject,
    name: string,
    getter: () => any
) {
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
export const showCost = function(cost: CostMatrix, room: Room): void {
    for (let x = 1; x < 49; x++)
        for (let y = 1; y < 49; y++) {
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
export const useCache = function<T extends ObjectWithId>(
    initValue: () => T,
    cachePlace: AnyObject,
    cacheKey: string
): T {
    const cacheId = cachePlace[cacheKey]
    let target: T = undefined

    // 如果有缓存了，就读取缓存
    if (cacheId) {
        target = Game.getObjectById(cacheId) as T
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
export const crossMerge = function<T = any>(a: T[], b: T[]): T[] {
    return Array.from({ length: a.length + b.length }, (_, index) => {
        return (index % 2 ? b.shift() : a.shift()) || a.shift() || b.shift()
    })
}
