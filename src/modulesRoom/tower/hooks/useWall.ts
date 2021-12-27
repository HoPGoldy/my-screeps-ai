import { TowerContext } from '../types'
import { TowerMemoryAccessor } from '../memory'
import { BUILD_NEW_WALL_LIMIT } from '../constants'

export const useWall = function (roomName: string, context: TowerContext, db: TowerMemoryAccessor) {
    const { getMemory, env, getWall, getRampart, updateBuildingTask } = context

    const run = function () {
        const buildSites = db.queryBuilding()
        const room = env.getRoomByName(roomName)

        // 如果都造好了，就放置新一批建筑
        if (buildSites.length <= 0) {
            if (!db.hasWaitingSite()) return

            const needFillWall = getNeedFillWall()
            if (needFillWall && needFillWall.hits < BUILD_NEW_WALL_LIMIT) return

            db.withdrawBuilding()
            const buildSites = db.queryBuilding()
            buildSites.forEach(siteInfo => {
                siteInfo.pos.createConstructionSite(siteInfo.type)
            })
            updateBuildingTask(room)
        }
        else {
            let needRebuild = false

            const existSites = buildSites.filter(({ pos, type }) => {
                // 有工地，还没造好
                const hasSite = pos.lookFor(LOOK_CONSTRUCTION_SITES).some(site => site.structureType === type)
                if (hasSite) return true
                // 有对应的建筑了，已经造好了
                const hasWall = pos.lookFor(LOOK_STRUCTURES).some(str => str.structureType === type)
                if (hasWall) return false
                // 啥都没有，需要重新放置
                pos.createConstructionSite(type)
                needRebuild = true
                return true
            })
            // 把已经造好的剔除掉
            db.updateBuilding(existSites)
            if (needRebuild) updateBuildingTask(room)
        }
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
        if (inRangePos.length > 0) env.log.success(`检测到 nuker，已将以下位置添加到刷墙计划：${inRangePos.join(', ')}`)
    }

    /**
     * 查找房间中用于抵御 nuker 的墙壁
     */
    const findNukerWall = function (room: Room) {
        const nukerPos = db.queryNukerWall()
        if (nukerPos.length <= 0) return undefined

        const nukers = room.find(FIND_NUKES)
        let targetRampart: StructureRampart
        nukerPos.find(pos => {
            const aboveRampart = pos.lookFor(LOOK_STRUCTURES).find(str => str.structureType === STRUCTURE_RAMPART) as StructureRampart
            // 没贴膜，放工地并停止搜索，因为这个 pos 数组是按照重要程度排序的，所以要搞完一个墙再搞另一个
            if (!aboveRampart) {
                pos.createConstructionSite(STRUCTURE_RAMPART)
                updateBuildingTask(room)
                return true
            }

            // 上面已经贴好膜了，看一下血量是不是够
            const nearNuker = pos.findInRange(nukers, 3)
            const aboveNuker = pos.lookFor(LOOK_NUKES)[0]
            // 计算墙体需要的血量
            let needHits = (aboveNuker ? NUKE_DAMAGE[0] : 0) + 2000
            const nearNukerCount = Math.max(0, aboveNuker ? nearNuker.length - 1 : nearNuker.length)
            needHits += NUKE_DAMAGE[2] * nearNukerCount

            // 血量足够了，继续检查下一个 nuker 覆盖位置
            if (aboveRampart.hits >= needHits) return false
            // 血量不够，就决定刷你了
            targetRampart = aboveRampart
            return true
        })

        return targetRampart
    }

    /**
     * 查找房间中的防御墙壁
     */
    const findNormalWal = function (room: Room) {
        const walls = [...getWall(room), ...getRampart(room)]
        // 找到生命值最小的墙并缓存起来
        return walls.reduce((minHitsWall, nextWall) => minHitsWall.hits < nextWall.hits ? minHitsWall : nextWall)
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

        // 优先刷 nuker 墙，再刷普通墙
        const targetWall = findNukerWall(room) || findNormalWal(room)
        if (!targetWall) return undefined
        // 缓存起来
        memory.focusWallId = targetWall.id
        memory.focusTimeout = env.getGame().time + 50

        return targetWall
    }

    return { addNewWall: db.updateWallSites, run, checkNuker, getNeedFillWall, clearFocus: db.deleteFocusWall }
}
