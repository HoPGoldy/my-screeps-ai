import { AppLifecycleCallbacks } from '@/modulesGlobal/framework/types'

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
    Game._uniqueKey = Game._uniqueKey ? Game._uniqueKey + 0.001 : Game.time
    return Game._uniqueKey
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
    const logs = ['已清理过期旗帜:']
    for (const flagName in Memory.flags) {
        if (!Game.flags[flagName]) {
            delete Memory.flags[flagName]
            logs.push(flagName)
        }
    }

    return logs.join(' ')
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
export const createGetter = function (target: Record<string, any>, name: string, getter: () => unknown) {
    Object.defineProperty(target.prototype, name, {
        get: getter,
        enumerable: false,
        configurable: true
    })
}

/**
 * 数组交叉合并
 */
export const crossMerge = function<T = unknown> (a: T[], b: T[]): T[] {
    return Array.from({ length: a.length + b.length }, (_, index) => {
        return (index % 2 ? b.shift() : a.shift()) || a.shift() || b.shift()
    })
}

/**
 * 将 array 转换为 kv 形式
 */
export const arrayToObject = function <T> (array: [string, T][]): { [key: string]: T } {
    return array.reduce((result, [key, process]) => {
        result[key] = process
        return result
    }, {})
}
