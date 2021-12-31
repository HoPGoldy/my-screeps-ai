import { createCache } from '@/utils'
import { useBoost } from './hooks/useBoost'
import { useMaintenance } from './hooks/useMaintenance'
import { useReaction } from './hooks/useReaction'
import { createLabAccessor } from './labAccessor'
import { createMemoryAccessor } from './memory'
import { LabContext } from './types'

export const createLabController = function (context: LabContext) {
    const { getMemory, env } = context

    const lazyLoader = function (roomName: string) {
        const db = createMemoryAccessor(() => getMemory(env.getRoomByName(roomName)))
        const labAccessor = createLabAccessor(roomName, context, db)

        // 添加 lab 管理功能
        const maintenances = useMaintenance(roomName, context, db, labAccessor)
        // 添加化合物反应功能
        const runReactionWork = useReaction(roomName, context, db, labAccessor)
        // 添加强化功能
        const { runBoostWork, ...boostMethods } = useBoost(roomName, context, db, labAccessor)

        const run = function () {
            runBoostWork()
            runReactionWork()
        }

        return { run, ...maintenances, ...boostMethods }
    }

    const [getLabController] = createCache(lazyLoader)
    return getLabController
}

export type LabController = ReturnType<ReturnType<typeof createLabController>>
