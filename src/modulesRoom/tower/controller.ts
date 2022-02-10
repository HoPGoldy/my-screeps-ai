import { createCache } from '@/utils'
import { useDefender } from './hooks/useDefender'
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

        const { run: runTower, ...towerMethods } = useTower(
            roomName, context, db, releaseDefender,
            room => defender.getUnit(room).map(([creep]) => creep)
        )
        const { run: runWallControl, checkNuker, ...wallMethods } = useWall(roomName, context, db)

        const run = function () {
            const workRoom = env.getRoomByName(roomName)
            runTower(workRoom)
            defender.run(workRoom)

            if (!env.inInterval(20)) runWallControl(workRoom)
            if (!env.inInterval(100)) checkNuker(workRoom)
        }

        return { run, ...wallMethods, ...towerMethods, getState: db.queryDefenseState }
    }

    const [getTowerController] = createCache(lazyLoader)
    const { defender, releaseDefender } = useDefender(context, room => getTowerController(room.name))
    return getTowerController
}

export type TowerController = ReturnType<ReturnType<typeof createTowerController>>
