import { useTower } from './hooks/useTower'
import { useWall } from './hooks/useWall'
import { createMemoryAccessor } from './memory'
import { TowerContext } from './types'

export const createTowerController = function (context: TowerContext) {
    const { getMemory, getWorkRoom, env } = context
    const db = createMemoryAccessor(getMemory, getWorkRoom)

    const { run: runTower, checkEnemyThreat } = useTower(context, db)
    const { run: runWallControl, getNeedFillWall, clearFocus } = useWall(context, db)

    const run = function () {
        runTower()

        if (env.inInterval(20)) return
        runWallControl()
    }

    return { run, checkEnemyThreat, getNeedFillWall, clearFocus }
}

export type TowerController = ReturnType<typeof createTowerController>
