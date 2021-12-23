import { createCache } from '@/utils'
import { useTower } from './hooks/useTower'
import { useWall } from './hooks/useWall'
import { createMemoryAccessor } from './memory'
import { TowerContext } from './types'

export const createTowerController = function (context: TowerContext) {
    const { getMemory, env } = context

    const lazyLoader = function (roomName: string) {
        const db = createMemoryAccessor(
            () => getMemory(env.getRoomByName(roomName)),
            roomName
        )

        const { run: runTower, ...towerMethods } = useTower(roomName, context, db)
        const { run: runWallControl, checkNuker, ...wallMethods } = useWall(roomName, context, db)

        const run = function () {
            runTower()

            if (!env.inInterval(20)) runWallControl()
            if (!env.inInterval(100)) checkNuker(env.getRoomByName(roomName))
        }

        return { run, ...wallMethods, ...towerMethods, getState: db.queryDefenseState }
    }

    const [getTowerController] = createCache(lazyLoader)
    return getTowerController
}

export type TowerController = ReturnType<ReturnType<typeof createTowerController>>
