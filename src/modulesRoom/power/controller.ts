import { createCache } from '@/utils'
import { useMaintenance } from './hooks/useMaintenance'
import { useRunPowerCreep } from './hooks/useRunPowerCreep'
import { useTaskHandler } from './hooks/useTaskHandler'
import { PowerContext } from './types'

/**
 * 房间 power 管理模块
 * 提供了一套 api 用于管理 power 任务
 */
export const createPowerController = function (context: PowerContext) {
    const { env, getGlobalMemory } = context

    const lazyLoader = function (roomName: string) {
        const maintenance = useMaintenance(roomName, context)
        const taskHandler = useTaskHandler(roomName, context, maintenance)
        const runManager = useRunPowerCreep(roomName, context, maintenance, taskHandler)

        return { runManager, ...maintenance }
    }

    const [getPowerController] = createCache(lazyLoader)

    /**
     * 把可用的 pc 能力挂到房间上，节省消耗
     */
    const mountPowerToRoom = function () {
        const config = getGlobalMemory()
        if (!config.creeps) return

        Object.keys(config.creeps).map(env.getPowerCreepByName).forEach(pc => {
            if (pc.room) getPowerController(pc.room.name).addSkill(pc)
        })
    }
    // 全局重置时调用一次即可
    mountPowerToRoom()

    /**
     * 给 powerCreep 指定工作房间
     *
     * @param pcName 要指定工作房间的 pc
     * @param roomName 要进行生成的房间名
     */
    const setWorkRoom = function (pcName: string, roomName: string): string {
        const pc = env.getPowerCreepByName(pcName)
        if (!pc) return `找不到名字为 ${pcName} 的 powerCreep，添加失败`
        const room = env.getRoomByName(roomName)
        if (!room) return `找不到名字为 ${roomName} 的房间，添加失败`

        const config = getGlobalMemory()
        if (!config.creeps) config.creeps = {}

        const result = config.creeps[pcName]
            ? `[${pcName}] 已将工作房间从 ${config.creeps[pcName]} 重置为 ${roomName}, 将会在冷却结束后复活在目标房间`
            : `[${pcName}] 已将工作房间设置为 ${roomName}`

        pc.suicide()
        config.creeps[pcName] = roomName

        return result
    }

    const removeWorkRoom = function (pcName: string): string {
        const pc = env.getPowerCreepByName(pcName)
        if (!pc) return `找不到名字为 ${pcName} 的 powerCreep，移除失败`
        const config = getGlobalMemory()
        if (!config.creeps) return '找不到配置项，无需移除'
        delete config.creeps[pcName]
        return `${pcName} 已移除`
    }

    /**
     * 【主要】pc 工作的主要入口
     */
    const run = function () {
        const config = getGlobalMemory()
        if (!config.creeps) return

        Object.entries(config.creeps).forEach(([creepName, workRoomName]) => {
            const pc = env.getPowerCreepByName(creepName)
            if (!pc) {
                delete config.creeps[creepName]
                env.log.warning(`找不到 powerCreep ${creepName} 已移除其工作配置项`)
                return
            }
            getPowerController(workRoomName).runManager(pc)
        })
    }

    return { getPowerController, run, setWorkRoom, removeWorkRoom }
}

export type PowerController = ReturnType<ReturnType<typeof createPowerController>['getPowerController']>
