import { TowerContext } from '../types'
import { TowerMemoryAccessor } from '../memory'
import { createCache } from '@/utils'
import { BUILD_NEW_WALL_LIMIT } from '../constants'

export const useWall = function (context: TowerContext, db: TowerMemoryAccessor) {
    const { getMemory, env, getWall, getRampart, updateBuildingTask, updateFillWallTask } = context

    const run = function () {
        const buildSites = db.queryBuilding()

        // 如果都造好了，就放置新一批建筑
        if (buildSites.length <= 0) {
            const needFillWall = getNeedFillWall()
            if (needFillWall && needFillWall.hits < BUILD_NEW_WALL_LIMIT) return
            db.insertBuilding()
            const buildSites = db.queryBuilding()
            buildSites.forEach(siteInfo => siteInfo.pos.createConstructionSite(siteInfo.type))
            updateBuildingTask()
        }
        else updateFillWallTask()
    }

    /**
     * 获取当前需要刷的墙
     */
    const getNeedFillWall = function () {
        const memory = getMemory()
        if (memory.focusWallId && memory.focusTimeout >= env.getGame().time) {
            const wall = env.getObjectById(memory.focusWallId)
            if (wall) return wall
            delete memory.focusWallId
            delete memory.focusTimeout
        }

        const walls = [...getWall(), ...getRampart()]

        // 找到生命值最小的墙并缓存起来
        const minHitsWall = walls.reduce((minHitsWall, nextWall) => minHitsWall.hits < nextWall.hits ? minHitsWall : nextWall)
        memory.focusWallId = minHitsWall.id
        memory.focusTimeout = env.getGame().time + 50

        return minHitsWall
    }

    return { addNewWall: db.updateWallSites, run, getNeedFillWall, clearFocus: db.deleteFocusWall }
}
