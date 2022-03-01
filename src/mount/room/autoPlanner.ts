import { baseLayout, clearStructure, createAutoPlanner } from '@/modulesGlobal/autoPlanning'
import { addConstructionSite } from '@/mount/global/construction'
import { ConstructInfo } from '@/modulesGlobal/construction/types'
import { BASE_SIZE } from '@/modulesGlobal/autoPlanning/planner/static/constant'
import { Color, log } from '@/utils'

export const autoPlanner = createAutoPlanner({
    placeSite: (room, planResult) => {
        const wallPosList: ConstructInfo<STRUCTURE_WALL | STRUCTURE_RAMPART>[] = []
        // 遍历布局中所有建筑类型
        const sitePosList: ConstructInfo[] = [].concat(...Object.keys(planResult).map((structureType: BuildableStructureConstant) => {
            if (structureType === STRUCTURE_WALL || structureType === STRUCTURE_RAMPART) {
                const wallInfos = planResult[structureType].map(({ x, y, roomName }) => {
                    return { x, y, roomName, type: structureType }
                })
                wallPosList.push(...wallInfos)

                return []
            }
            // 如果是关键建筑，就执行检查：如果建筑里没有能量（就没有利用价值）了，直接摧毁
            if (structureType === STRUCTURE_STORAGE || structureType === STRUCTURE_TERMINAL || structureType === STRUCTURE_FACTORY) {
                const structure = room[structureType]
                const isNotMy = structure && !structure.my
                if (
                    // 如果是工厂的话直接摧毁，因为就算里边有能量 creep 也不会用
                    (structureType === STRUCTURE_FACTORY && isNotMy) ||
                    // storage 和 terminal 要看里边有没有能量
                    (isNotMy && structure.store[RESOURCE_ENERGY] <= 100)
                ) structure.destroy()
            }

            // 遍历该建筑下的所有预放置点位
            return planResult[structureType].map(({ x, y, roomName }) => {
                return { x, y, roomName, type: structureType }
            })
        }))

        console.log('sitePosList', sitePosList)
        // 放置工地并发布建造任务
        if (sitePosList.length > 0) {
            addConstructionSite(sitePosList)
            room.work.addBuildTask()
        }
        // 有墙壁的话就转交给房间防御模块负责建造
        if (wallPosList.length > 0) room.towerController.addNewWall(wallPosList)
    }
})

/**
 * 执行指定房间自动建筑规划
 */
export const planRoomLayout = function (room: Room): string {
    if (room.memory.noLayout) return '房间指定了 noLayout，不运行自动规划'
    if (!room.memory.center) return '房间未指定中央点位'

    // 一级的时候移除所有非重要建筑
    if (room.controller.level === 1) clearStructure(room)

    const centerPos = new RoomPosition(...room.memory.center, room.name)
    const result = autoPlanner.runStaticPlan(room, centerPos)

    if (result === OK) return '自动规划完成'
    else if (result === ERR_NOT_OWNER) return '自动规划失败，房间没有控制权限'
}

/**
 * 给指定房间设置中心点
 *
 * @param room 要设置中心点的房间
 * @param centerPos 中心点坐标
 */
export const setBaseCenter = function (room: Room, centerPos: RoomPosition): OK | ERR_INVALID_ARGS {
    if (!centerPos) return ERR_INVALID_ARGS

    room.memory.center = [centerPos.x, centerPos.y]
    return OK
}

/**
 * 刚刚放下第一个 spawn 后自动设置基地中心
 *
 * @param firstSpawn 第一个 spawn
 */
export const setBornCenter = function (firstSpawn: StructureSpawn) {
    const [offsetX, offsetY] = baseLayout[0][STRUCTURE_SPAWN][0]

    const { x, y, roomName } = firstSpawn.pos
    try {
        const centerPos = new RoomPosition(x - offsetX, y - offsetY, roomName)
        const terrain = new Room.Terrain(roomName)

        // 查找在基地布局之内是否有墙体
        let hasWallInRange = false
        for (let y = centerPos.y - 5; y < centerPos.y + 5; y++) {
            for (let x = centerPos.x - 5; x < centerPos.x + 5; x++) {
                if (terrain.get(x, y) !== TERRAIN_MASK_WALL) continue
                hasWallInRange = true
                break
            }
            if (hasWallInRange) break
        }

        // 设置中心点位，上面找到墙的话就给个提示
        if (setBaseCenter(firstSpawn.room, centerPos) === OK) {
            const warningTip = hasWallInRange ? `，但是以该目标为中心的 ${BASE_SIZE}*${BASE_SIZE} 区域内存在墙体，将导致有建筑无法建筑` : ''
            log(`已将 ${centerPos} 设置为基地中心点${warningTip}`, '自动规划', hasWallInRange ? Color.Yellow : Color.Green)
        }
        else log(`${centerPos} 无法设置为基地中心点，请手动设置`, '自动规划', Color.Yellow)
    }
    catch (e) {
        log(`[${x - offsetX}, ${y - offsetY}, ${roomName}] 无法设置为基地中心点，请手动设置`, '自动规划', Color.Yellow)
    }
}

declare global {
    /**
     * 房间内存
     */
    interface RoomMemory {
        /**
         * 基地中心点坐标, [0] 为 x 坐标, [1] 为 y 坐标
         */
        center: [number, number]
        /**
         * 是否关闭自动布局，该值为 true 时将不会对本房间运行自动布局
         */
        noLayout: boolean
    }
}
