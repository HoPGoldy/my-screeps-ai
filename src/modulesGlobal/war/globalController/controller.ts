import { EnvContext } from '@/contextTypes'
import { arrayToObject, createCluster } from '@/utils'
import { createMemoryAccessor } from './memoryAccessor'
import { SquadType, SquadTypeName } from '../squadManager/types'
import { WarMemory, WarModuleMemory, WarState } from '../types'
import { createWarManager, WarContext, WarManager } from '../warManager/warManager'
import { contextCostMatrix, contextRoomInfo, contextEnemyDamage } from '../context'
import { useCollectRoomInfo } from './hook/useCollectRoomInfo'
import { useGetRoomCostMatrix } from './hook/useRoomCost'
import { useRoomEnemyDamage } from './hook/useRoomEnemyDamage'

export type WarModuleContext = {
    getMemory: () => WarModuleMemory
} & EnvContext

/**
 * 创建战争模块
 */
export const createWarController = function (context: WarModuleContext) {
    const db = createMemoryAccessor(context.getMemory)

    // 提供房间信息
    const [getRoomInfo, refreshRoomInfo] = useCollectRoomInfo(context.env.getRoomByName)
    contextRoomInfo.provide(getRoomInfo)

    // 提供基础寻路 cost
    const [getCostMatrix, refreshCostMatrix] = useGetRoomCostMatrix(getRoomInfo)
    contextCostMatrix.provide(getCostMatrix)

    // 提供敌方伤害
    const [getEnemyDamage, refreshEnemyDamage] = useRoomEnemyDamage(getRoomInfo)
    contextEnemyDamage.provide(getEnemyDamage)

    /**
     * 创建战争管理器上下文
     */
     const createWarContext = function (warCode: string): WarContext {
        return {
            warCode,
            removeSelf: () => {
                db.deleteWar(warCode)
                warCluster.remove(warCode)
            },
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
    const warCluster = createCluster(initWar)

    /**
     * 检查孵化房间是否可用
     */
    const spawnRoomCheck = function (room: Room): boolean {
        if (!room?.controller?.my) {
            context.env.log.warning(`房间 ${room.name} 所有者不为自己，无法作为孵化房间`)
            return false
        }
        return true
    }

    /**
     * 启动新战争
     * 
     * @param spawnRoomName 孵化单位的房间名
     * @param warCode 战争代号
     */
    const startWar = function (spawnRoomName: string, warCode: string): WarManager | undefined {
        const spawnRoom = context.env.getRoomByName(spawnRoomName)

        if (!spawnRoom) {
            context.env.log.warning(`找不到房间 ${spawnRoomName}`)
            return
        }
        if (!context.env.getFlagByName(warCode)) return
        if (!spawnRoomCheck(spawnRoom)) return

        const warMemory: WarMemory = {
            code: warCode,
            alonedCreep: [],
            state: WarState.Progress,
            spawnRoomName,
            squads: {},
            mobilizes: []
        }

        db.insertWarMemory(warMemory)
        const newWar = createWarManager(createWarContext(warCode))
        warCluster.add(warCode, newWar)

        // 有设置默认小队的话就直接添加动员任务
        const [squadType, needBoost, squadCode] = db.queryDefaultSquad() || []
        if (squadType) newWar.addMobilize(squadType, needBoost, squadCode, squadCode)

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

    /**
     * 显示状态
     */
    const showState = function () {
        const logs = warCluster.showState()
        const [squadType, needBoost, squadCode] = db.queryDefaultSquad() || [];

        if (!squadType) logs.push('\n未配置默认小队')
        else logs.push(`\n默认小队：[小队类型] ${SquadTypeName[squadType]} [是否 boost] ${needBoost} [小队代号] ${squadCode || '自动分配'}`)

        return logs.join('\n')
    }

    /**
     * 运行战争模块
     */
    const run = function () {
        refreshCostMatrix()
        refreshRoomInfo()
        refreshEnemyDamage()

        warCluster.run()
    }

    return { wars: warCluster, startWar, setDefault, run, clearDefault: db.deleteDefaultSquad, showState }
}
