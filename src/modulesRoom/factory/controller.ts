import { createCache } from '@/utils'
import { FactoryState } from './constants'
import { useGetResource } from './hooks/useGetResource'
import { useGlobalShow } from './hooks/useGlobalShow'
import { useMaintenance } from './hooks/useMaintenance'
import { usePrepare } from './hooks/usePrepare'
import { usePutResource } from './hooks/usePutResource'
import { useWorking } from './hooks/useWorking'
import { createMemoryAccessor } from './memory'
import { FactoryContext } from './types'

export const createFactoryController = function (context: FactoryContext) {
    const { getMemory, env, getFactory } = context
    const showGlobal = useGlobalShow(context)

    const lazyLoader = function (roomName: string) {
        const db = createMemoryAccessor(() => getMemory(env.getRoomByName(roomName)))

        const maintenance = useMaintenance(roomName, context, db)
        const runPrepare = usePrepare(context, db, maintenance)
        const runGetResource = useGetResource(context, db, maintenance)
        const runWorking = useWorking(context, db)
        const runPutResource = usePutResource(context, db)

        /**
         * 工厂所有的工作阶段
         */
        const stages = {
            [FactoryState.Prepare]: runPrepare,
            [FactoryState.GetResource]: runGetResource,
            [FactoryState.Working]: runWorking,
            [FactoryState.PutResource]: runPutResource
        }

        /**
         * 工厂执行工作入口
         */
        const run = function () {
            const room = env.getRoomByName(roomName)
            // 没有 factory 则跳过
            if (!getFactory(room)) return

            const memory = getMemory(room)
            const { state, sleep, pause } = memory
            // 暂停了，跳过
            if (pause) return

            // 检查工厂是否在休眠
            if (sleep) {
                if (env.getGame().time > sleep) maintenance.wakeup()
                else return
            }

            // 执行工作
            stages[state](room, memory)
        }

        // 只暴露需要的方法给外界
        const { handleInsufficientResource, addTask, ...exposeMaintenance } = maintenance
        return { run, ...exposeMaintenance, clearTask: db.clearTask }
    }

    const [getFactoryController] = createCache(lazyLoader)
    return { getFactoryController, showGlobal }
}

export type FactoryController = ReturnType<ReturnType<typeof createFactoryController>['getFactoryController']>
