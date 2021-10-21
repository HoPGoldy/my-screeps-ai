import { ContextGetCreepByName, ContextGetFlagByName, ContextGetRoomByName, ContextLog } from '@/contextTypes'
import { arrayToObject, createCache, createCluster } from '@/utils'
import { createMemoryAccessor } from './memoryAccessor'
import { SquadType } from './squadManager/types'
import { RoomInfo, WarMemory, WarModuleMemory, WarState } from './types'
import { createWarManager, WarContext, WarManager } from './warManager/warManager'

export type WarModuleContext = {
    getMemory: () => WarModuleMemory
} & ContextGetRoomByName & ContextGetFlagByName & ContextLog & ContextGetCreepByName

const useWar = function (
    db: ReturnType<typeof createMemoryAccessor>,
    getRoomInfo: (roomName: string) => RoomInfo,
    getCostMatrix: (roomName: string) => CostMatrix,
    context: WarModuleContext
) {
    /**
     * 创建战争管理器上下文
     */
    const createWarContext = function (warCode: string): WarContext {
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

    
    // 初始化所有战争进程
    const { add, run: runAllWarProcess, showState: showWarState } = createCluster(initWar)

    /**
     * 启动新战争
     * 
     * @param spawnRoomName 孵化单位的房间名
     * @param warCode 战争代号
     */
    const startWar = function (spawnRoomName: string, warCode: string): WarManager {
        if (!context.getFlagByName(warCode)) return undefined

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
        add(warCode, newWar)

        // 有设置默认小队的话就直接添加动员任务
        const [squadType, needBoost, squadCode] = db.queryDefaultSquad()
        if (squadType) newWar.addMobilize(squadType, needBoost, squadCode || warCode + 'A')

        return newWar
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

    const showState = function () {
        return showWarState().join('\n')
    }

    return { startWar, setDefault, runAllWarProcess, showState }
}

const useCollectRoomInfo = function (getRoomByName: (roomName: string) => Room) {
    const collectRoomInfo = function (roomName: string): RoomInfo | undefined {
        const room = getRoomByName(roomName)
        if (!room) return undefined

        const hostileCreeps = room.find(FIND_HOSTILE_CREEPS)
        const hostilePowerCreeps = room.find(FIND_HOSTILE_POWER_CREEPS)
        const hostileSite = room.find(FIND_HOSTILE_CONSTRUCTION_SITES)
        const myCreeps = room.find(FIND_MY_CREEPS)
        const myPowerCreeps = room.find(FIND_MY_POWER_CREEPS)
        const structures = room.find(FIND_STRUCTURES)

        const structureGroup = _.groupBy(structures, s => s.structureType)

        return {
            hostileCreeps,
            hostilePowerCreeps,
            hostileSite,
            myCreeps,
            myPowerCreeps,
            ...structureGroup
        } as RoomInfo
    }

    // 用于管理本 tick 的房间搜索信息缓存
    const { get: getRoomInfo, refresh: refreshRoomInfo } = createCache(collectRoomInfo)

    return { getRoomInfo, refreshRoomInfo }
}

const useGetRoomCostMatrix = function (getRoomInfo: (roomName: string) => RoomInfo | undefined) {
    const createRoomBaseCostMatrix = function (roomName: string): CostMatrix | undefined {
        const roomInfo = getRoomInfo(roomName)
        if (!roomInfo) return undefined
        const { hostileCreeps, hostilePowerCreeps, myCreeps, myPowerCreeps, road } = roomInfo

        const costs = new PathFinder.CostMatrix;

        [...hostileCreeps, ...hostilePowerCreeps, ...myCreeps, ...myPowerCreeps].map(creep => {
            costs.set(creep.pos.x, creep.pos.y, 255)
        })
        road.map(r=> costs.set(r.pos.x, r.pos.y, 1))

        return costs
    }

    // 用于管理本 tick 所有的基础房间 cost 缓存
    const { get: getCostMatrix, refresh: refreshCostMatrix } = createCache(createRoomBaseCostMatrix)

    return { getCostMatrix, refreshCostMatrix }
}

export const createWarModule = function (context: WarModuleContext) {
    const db = createMemoryAccessor(context.getMemory)

    const { getRoomInfo, refreshRoomInfo } = useCollectRoomInfo(context.getRoomByName)
    const { getCostMatrix, refreshCostMatrix } = useGetRoomCostMatrix(getRoomInfo)
    const { startWar, runAllWarProcess, showState, setDefault } = useWar(db, getRoomInfo, getCostMatrix, context)

    /**
     * 运行战争模块
     */
    const run = function () {
        refreshCostMatrix()
        refreshRoomInfo()
        runAllWarProcess()
    }

    return { startWar, setDefault, run, clearDefault: db.deleteDefaultSquad, showState }
}
