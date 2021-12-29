import { createCache } from '@/utils'
import { useDealOrder } from './hooks/useDealOrder'
import { useMaintenance } from './hooks/useMaintenance'
import { useTaskListener } from './hooks/useTaskListener'
import { createMemoryAccessor } from './memory'
import { TerminalContext } from './types'

export const createTerminalController = function (context: TerminalContext) {
    const { getMemory, env, hasShareTask, execShareTask, scanState } = context

    const lazyLoader = function (roomName: string) {
        const db = createMemoryAccessor(() => getMemory(env.getRoomByName(roomName)))

        const { runBalanceResource, ...maintenance } = useMaintenance(roomName, context, db)
        const dealOrder = useDealOrder(context, db)
        const listenTask = useTaskListener(context, db)

        /**
         * 【主要】terminal 管理模块入口
         */
        const run = function () {
            const room = env.getRoomByName(roomName)
            // 没有冷却好就跳过，或者每 10t 执行一次
            if (!room.controller.owner || !room.terminal || !room.terminal.my || room.terminal.cooldown) return
            if (env.inInterval(10)) return

            if (!env.inInterval(100) && room.terminal.store.getFreeCapacity() < 50000) {
                runBalanceResource()
            }

            // 执行资源统计
            if (scanState && !env.inInterval(20)) scanState(room.terminal)

            // 优先执行共享任务
            if (hasShareTask && hasShareTask(room)) {
                execShareTask && execShareTask(room.terminal)
                return
            }

            // 获取资源规则
            const task = db.queryCurrentListenTask()
            if (!task) return

            // 处理之前没做完的订单
            if (!dealOrder(task, room)) return

            // 没有待处理订单，继续监听任务
            listenTask(task, room)
        }

        return { run, ...maintenance, addTask: db.insertListenTask, removeTask: db.deleteListenTask }
    }

    const [getTerminalController] = createCache(lazyLoader)
    return getTerminalController
}

export type TerminalController = ReturnType<ReturnType<typeof createTerminalController>>
