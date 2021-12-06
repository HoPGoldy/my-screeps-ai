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

        const { run: runTower, checkEnemyThreat, findEnemy } = useTower(roomName, context, db)
        const { run: runWallControl, addNewWall, checkNuker, getNeedFillWall, clearFocus } = useWall(roomName, context, db)

        const run = function () {
            runTower()

            if (!env.inInterval(20)) runWallControl()
            if (!env.inInterval(100)) checkNuker(env.getRoomByName(roomName))
        }

        return { run, addNewWall, checkEnemyThreat, getNeedFillWall, clearFocus, findEnemy, getState: db.queryDefenseState }
    }

    return lazyLoader
}

export type TowerController = ReturnType<ReturnType<typeof createTowerController>>
