import planBase from './planBase'
import planRoad from './planRoad'
import planWall from './planWall'
import { AutoPlanResult } from '../../types'
import { createCache } from '@/utils'

/**
 * RCL 分别在几级时放置外墙
 * 例如 [ 3, 7, 8 ] 代表分别在第 3、7、8 级时放置第 1（最外层）、2、3 层 rampart
 */
const LEVEL_BUILD_RAMPART = [4, 8, 8]

/**
 * RCL 几级的时候开始放置通向 [ source, controller, mineral ] 的道路
 * 注意这个顺序要和 src\modules\autoPlanning\planRoad.ts 的默认方法返回值保持一致
 */
const LEVEL_BUILD_ROAD = [3, 4, 6]

export const runPlanPure = function (room: Room, centerPos: RoomPosition): AutoPlanResult[] {
    // 计算基地内的静态建筑点位
    const result = planBase(room, centerPos)

    // 执行自动墙壁规划，获取 rampart 位置
    const wallsPos = planWall(room, centerPos)

    wallsPos.forEach((walls, index) => {
        const placeLevel = LEVEL_BUILD_RAMPART[index]

        // 最外层会每隔一格放一个 wall，节省能量消耗
        if (index === 0) {
            const ramparts: RoomPosition[] = []
            const buildwalls: RoomPosition[] = []
            walls.forEach(pos => {
                const { x, y } = pos
                if ((y % 2 && x % 2) || (y % 2 - 1 && x % 2 - 1)) ramparts.push(pos)
                else buildwalls.push(pos)
            })
            mergeStructurePlan(result, ramparts, placeLevel, STRUCTURE_RAMPART)
            mergeStructurePlan(result, buildwalls, placeLevel, STRUCTURE_WALL)
        }
        else {
            mergeStructurePlan(result, walls, placeLevel, STRUCTURE_RAMPART)
        }
    })

    // 执行自动道路规划，获取基地之外的 road 位置
    const roadPos = planRoad(room, centerPos, result)

    roadPos.forEach((roads, index) => {
        mergeStructurePlan(result, roads, LEVEL_BUILD_ROAD[index], STRUCTURE_ROAD)
    })

    return result
}

/**
 * 对指定房间执行建筑规划
 *
 * @param room 要执行规划的房间
 * @return 所有需要放置工地的位置
 */
export const [runPlan] = createCache(runPlanPure, { getCacheKey: room => room.name })

/**
 * 将新的建筑位置合并到现有的规划方案
 *
 * @param origin 要合并到的原始规划方案
 * @param newData 要进行合并的新位置数据
 * @param level 要合并到的等级
 * @param type 要合并到的建筑类型
 */
const mergeStructurePlan = function (origin: AutoPlanResult[], newData: RoomPosition[], level: number, type: BuildableStructureConstant): OK {
    // 先取出已经存在的道路
    const targetStructurePos = origin[level - 1][type] || []
    // 然后把新道路追加进去
    origin[level - 1][type] = [...targetStructurePos, ...newData]

    return OK
}
