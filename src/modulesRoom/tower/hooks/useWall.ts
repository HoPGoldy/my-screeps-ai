import { TowerContext } from '../types'
import { TowerMemoryAccessor } from '../memory'
import { BUILD_NEW_WALL_LIMIT } from '../constants'

export const useWall = function (roomName: string, context: TowerContext, db: TowerMemoryAccessor) {
    const { getMemory, env, getWall, getRampart, updateBuildingTask, updateFillWallTask } = context

    const run = function () {
        const buildSites = db.queryBuilding()
        const room = env.getRoomByName(roomName)

        // 如果都造好了，就放置新一批建筑
        if (buildSites.length <= 0) {
            const needFillWall = getNeedFillWall()
            if (needFillWall && needFillWall.hits < BUILD_NEW_WALL_LIMIT) return
            db.withdrawBuilding()
            const buildSites = db.queryBuilding()
            buildSites.forEach(siteInfo => siteInfo.pos.createConstructionSite(siteInfo.type))
            updateBuildingTask(room)
        }
        else updateFillWallTask(room)
    }

    /**
     * 检查当前房间被扔核弹了没
     */
    const checkNuker = function (room: Room) {
        // 核弹范围内的 spawn 位置
        const spawnPos: RoomPosition[] = []
        // 范围内的重要建筑位置
        const importantPos: RoomPosition[] = []
        // 范围内的建筑位置
        const structurePos: RoomPosition[] = []

        room.find(FIND_NUKES).forEach(nuker => {
            const inRangeStructure = nuker.pos.findInRange(FIND_MY_STRUCTURES, 3)
            // 分类记录范围内的建筑，用于区分优先级
            inRangeStructure.forEach(({ structureType, pos }) => {
                if (structureType === STRUCTURE_SPAWN) spawnPos.push(pos)
                else if (structureType === STRUCTURE_EXTENSION) structurePos.push(pos)
                else if (
                    structureType !== STRUCTURE_RAMPART &&
                    structureType !== STRUCTURE_OBSERVER
                ) importantPos.push(pos)
            })
        })

        const inRangePos = [...spawnPos, ...importantPos, ...structurePos]
        db.updateNukerWall(inRangePos)
    }

    /**
     * 获取当前需要刷的墙
     */
    const getNeedFillWall = function () {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)
        if (memory.focusWallId && memory.focusTimeout >= env.getGame().time) {
            const wall = env.getObjectById(memory.focusWallId)
            if (wall) return wall
            delete memory.focusWallId
            delete memory.focusTimeout
        }

        const walls = [...getWall(room), ...getRampart(room)]

        // 找到生命值最小的墙并缓存起来
        const minHitsWall = walls.reduce((minHitsWall, nextWall) => minHitsWall.hits < nextWall.hits ? minHitsWall : nextWall)
        memory.focusWallId = minHitsWall.id
        memory.focusTimeout = env.getGame().time + 50

        return minHitsWall
    }

    return { addNewWall: db.updateWallSites, run, checkNuker, getNeedFillWall, clearFocus: db.deleteFocusWall }
}
