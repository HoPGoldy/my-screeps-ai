import { runPlan } from './planner/static'
import { AutoPlanResult } from './types'

type AutoPlannerContext = {
    placeSite: (room: Room, result: AutoPlanResult) => unknown
}

/**
 * 将多级的自动规划结果压平成一个
 */
const squashPlanResult = function (result: AutoPlanResult[], maxLevel: number): AutoPlanResult {
    const squashedResult: AutoPlanResult = {}

    Object.entries(result)
        .filter(([level]) => Number(level) <= maxLevel)
        .forEach(([level, levelResult]) => {
            Object.entries(levelResult).forEach(([strType, posList]) => {
                if (!squashedResult[strType]) squashedResult[strType] = []
                squashedResult[strType].push(...posList)
            })
        })

    // Object.entries(squashedResult).forEach(([type, pos]) => console.log(type, pos.map(p => `${p.x},${p.y}`).join(' ')))
    return squashedResult
}

/**
 * 创建自动规划模块
 */
export const createAutoPlanner = function (context: AutoPlannerContext) {
    const { placeSite } = context

    /**
     * 执行集中布局规划
     *
     * @param room 要执行规划的房间
     * @param center 基地中心点位
     */
    const runStaticPlan = function (room: Room, center: RoomPosition): OK | ERR_NOT_OWNER {
        // 房间不属于自己就退出
        if (!room.controller || !room.controller.my) return ERR_NOT_OWNER

        const planResult = runPlan(room, center)
        placeSite(room, squashPlanResult(planResult, room.controller.level))
        return OK
    }

    return { runStaticPlan }
}

/**
 * 清理房间中的非己方建筑
 * 会保留非空的 Terminal、Storage 以及 factory
 *
 * @param room 要执行清理的房间
 * @returns OK 清理完成
 * @returns ERR_NOT_FOUND 未找到建筑
 */
export const clearStructure = function (room: Room): OK | ERR_NOT_FOUND {
    const notMyStructure = room.find(FIND_STRUCTURES, { filter: s => !s.my })

    if (notMyStructure.length <= 0) return ERR_NOT_FOUND

    notMyStructure.forEach(s => {
        // 如果是这下面几种建筑则看一下存储，只要不为空就不摧毁，如果玩家觉得里边的资源不重要的话就手动摧毁
        if (
            s.structureType === STRUCTURE_TERMINAL ||
            s.structureType === STRUCTURE_FACTORY ||
            s.structureType === STRUCTURE_STORAGE ||
            s.structureType === STRUCTURE_CONTAINER
        ) {
            if (s.store.getUsedCapacity() > 0) return
        }
        // 墙壁和道路交给玩家决定，默认不摧毁
        else if (s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_ROAD) return

        // 其他建筑一律摧毁
        s.destroy()
    })

    return OK
}
