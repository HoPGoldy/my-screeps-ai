import { ContextGetCreepByName, ContextGetFlagByName, ContextGetRoomByName, ContextLog } from '@/contextTypes'
import { arrayToObject, createCache, createCluster } from '@/utils'
import { createMemoryAccessor } from './memoryAccessor'
import { SquadType } from './squadManager/types'
import { WarMemory, WarModuleMemory, WarState } from './types'
import { collectRoomInfo, createRoomBaseCostMatrix } from './utils'
import { createWarManager } from './warManager/warManager'

export type WarModuleContext = {
    getMemory: () => WarModuleMemory
} & ContextGetRoomByName & ContextGetFlagByName & ContextLog & ContextGetCreepByName

export const createWarModule = function (context: WarModuleContext) {
    const { getMemory } = context
    const db = createMemoryAccessor(getMemory)

    /**
     * 创建战争管理器上下文
     */
    const createWarContext = function (warCode: string) {
        return {
            warCode,
            getCostMatrix,
            getRoomInfo,
            getWarMemory: () => db.queryWarMemory(warCode),
            ...context
        }
    }

    /**
     * 初始化所有战争
     */
    const initWar = function () {
        const warCodes = db.queryWarCodes()
        return arrayToObject(warCodes.map(code => [code, createWarManager(createWarContext(code))]))
    }

    // 用于管理本 tick 所有的基础房间 cost 缓存
    const { get: getCostMatrix, refresh: refreshCostMatrix } = createCache(createRoomBaseCostMatrix)
    // 用于管理本 tick 的房间搜索信息缓存
    const { get: getRoomInfo, refresh: refreshRoomInfo } = createCache(collectRoomInfo)
    // 初始化所有战争进程
    const { add: addWarProcess, run: runAllWarProcess } = createCluster(initWar)

    /**
     * 启动新战争
     * 
     * @param spawnRoomName 孵化单位的房间名
     * @param warCode 战争代号
     */
    const startWar = function (spawnRoomName: string, warCode: string) {
        const warMemory: WarMemory = {
            code: warCode,
            alonedCreep: [],
            state: WarState.Progress,
            spawnRoomName,
            squads: {},
            mobilizes: {}
        }

        db.insertWarMemory(warMemory)
        const newWar = createWarManager(createWarContext(warCode))
        addWarProcess(warCode, newWar)

        // 有设置默认小队的话就直接添加动员任务
        const [squadType, needBoost, squadCode] = db.queryDefaultSquad()
        if (squadType) newWar.addMobilize(squadType, needBoost, squadCode || warCode + 'A')
    }

    /**
     * 设置新战争默认发布小队
     * 
     * @param squadType 要发布的小队类型
     * @param needBoost 是否需要强化
     * @param squadCode 小队代号（为空则默认为战争代号）
     */
    const setDefault = function (squadType: SquadType, needBoost: boolean, squadCode?: string) {
        db.updateDefaultSquad(squadType, needBoost, squadCode)
    }

    /**
     * 运行战争模块
     */
    const run = function () {
        refreshCostMatrix()
        refreshRoomInfo()

        runAllWarProcess()
    }

    return { startWar, setDefault, run, clearDefault: db.deleteDefaultSquad }
}
