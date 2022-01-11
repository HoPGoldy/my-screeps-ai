import { ObjectWithId } from './types'
import { bold, green, red, yellow, blue, createLog } from './console'
import { EnvMethods } from '@/utils'

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
export const createContext = function <T> (defaultValue?: T) {
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
    const provide = function (value: T) {
        context = value
    }

    return { use, provide }
}

export const createCluster = function <T extends ObjectWithRun> (
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

    const map = function <R> (func: (process: T, name: string) => R) {
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

interface CreateCacheOptions<T extends (...args: unknown[]) => unknown> {
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
 * 当 getResultCallback 第一个参数不为数字、字符串时需务必指定 getCacheKey！
 *
 * @param getResultCallback 要缓存返回值的函数
 */
export const createCache = function <T extends (...args: unknown[]) => unknown>(
    getResultCallback: T,
    opt: CreateCacheOptions<T> = {}
): [T, () => void, (key: string| number) => void] {
    let cacheStorage: { [key: string]: ReturnType<T> } = {}

    /**
     * 添加了缓存功能的 callback 函数
     */
    const get = function (...args) {
        // 找到缓存的键
        const cacheKey = opt.getCacheKey ? opt.getCacheKey(...args as Parameters<T>) : (args[0] as string || 1)
        if (cacheKey in cacheStorage) {
            const cacheData = cacheStorage[cacheKey]
            // 检查一下是否可以重用这个缓存
            const keepReuse = opt.shouldReuse ? opt.shouldReuse(cacheData, ...args as Parameters<T>) : true
            if (keepReuse) return cacheStorage[cacheKey]
        }
        cacheStorage[cacheKey] = getResultCallback(...args) as ReturnType<T>
        return cacheStorage[cacheKey]
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
 * 获取指定对象并缓存
 * 会将初始化回调的返回值进行缓存，该返回值 **必须拥有 id 字段**
 *
 * @param initValue 初始化该值的回调，在没有找到缓存 id 时将会调用该方法获取要缓存的初始值
 * @param cachePlace id 存放的对象，一般位于 xxx.memory 上
 * @param cacheKey 要缓存到的键，例如 targetId 之类的字符串
 */
export const useCache = function <T extends ObjectWithId> (
    initValue: () => T,
    cachePlace: Record<string, any>,
    cacheKey: string
): T {
    const cacheId = cachePlace[cacheKey]
    let target: T

    // 如果有缓存了，就读取缓存
    if (cacheId) {
        target = Game.getObjectById<T>(cacheId)
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
 * 静态的环境上下文
 * 用于避免重复创建
 */
const staticEnvContext = {
    getGame: () => Game,
    getRoomByName: roomName => Game.rooms[roomName],
    getCreepByName: creepName => Game.creeps[creepName],
    getFlagByName: flagName => Game.flags[flagName],
    getObjectById: id => Game.getObjectById(id),
    inInterval: interval => !!(Game.time % interval),
    colorful: { green, red, yellow, blue, bold }
}

/**
 * 创建环境上下文
 * @param moduleName 模块的名字
 */
export const createEnvContext = function (moduleName: string): EnvMethods {
    return {
        ...staticEnvContext,
        log: createLog(moduleName)
    }
}
