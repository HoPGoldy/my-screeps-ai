import { DefaultTaskUnitMemory } from '@/modulesRoom/taskBase'
import { createRole } from '@/modulesRoom/unitControl'
import { createStaticBody } from '@/utils'
import { ManagerActionStrategy, ManagerData, ManagerState, TransportContext, InnerGetTransportController } from '../types'
import { TRANSFER_DEATH_LIMIT, useDeathClear } from './useDeathClear'
import { useClearRemains } from './useClearRemains'
import { useGetResource } from './useGetResource'
import { usePutResource } from './usePutResource'

/**
 * 生成搬运工的身体
 */
export const getManagerBody = createStaticBody(
    [[CARRY, 2], [MOVE, 1]],
    [[CARRY, 3], [MOVE, 2]],
    [[CARRY, 4], [MOVE, 2]],
    [[CARRY, 5], [MOVE, 3]],
    [[CARRY, 8], [MOVE, 4]],
    [[CARRY, 14], [MOVE, 7]],
    [[CARRY, 20], [MOVE, 10]],
    [[CARRY, 32], [MOVE, 16]]
)

export const useManager = function (context: TransportContext, getTransportController: InnerGetTransportController) {
    const { roleName, getMemory, onCreepStageChange, addSpawnCallback, addSpawnTask } = context

    /**
     * 不同任务的对应工作逻辑
     */
    const actionStrategys: { [type in ManagerState]: ManagerActionStrategy } = {
        // 清空身上的非任务资源，防止占用空间影响效率
        [ManagerState.ClearRemains]: useClearRemains(context),
        // 快死之前清空自己身上携带的资源
        [ManagerState.DeathClear]: useDeathClear(context),
        // 从指定目标获取资源
        [ManagerState.GetResource]: useGetResource(context),
        // 把资源存放到指定目标
        [ManagerState.PutResource]: usePutResource(context)
    }

    const manager = createRole<DefaultTaskUnitMemory & ManagerData>({
        getMemory: room => {
            const memory = getMemory(room)
            if (!memory.creeps) memory.creeps = {}
            return memory.creeps
        },
        onCreepDead: (creepName, memory, workRoom) => {
            // 被炒鱿鱼了就停止孵化，否则就一直孵化
            if (memory.fired) return false
            releaseManager(workRoom, creepName)
        },
        runTarget: (manager, managerData, workRoom) => {
            const { countLifeTime, countWorkTime, getUnitTask, requireFinishTask } = getTransportController(workRoom)
            countLifeTime()
            const taskData = getUnitTask(manager)
            if (!taskData) {
                manager.say('💤')
                return false
            }

            countWorkTime()

            const { x, y } = manager.pos
            manager.room.visual.text(taskData.type.toString(), x, y, { opacity: 0.5, font: 0.3 })

            // 快死了就强制转为死亡处理阶段
            if (manager.ticksToLive <= TRANSFER_DEATH_LIMIT) managerData.state = ManagerState.DeathClear

            // 执行对应的阶段
            const run = actionStrategys[managerData.state]
            run({
                manager, workRoom, taskData, managerData,
                requireFinishTask: reason => requireFinishTask(taskData, reason, manager)
            })

            return false
        },
        onCreepStageChange
    })

    addSpawnCallback(roleName, manager.addUnit)

    /**
     * 发布搬运工
     *
     * @param room 要发布到的房间
     * @param creepName 要发布的单位名称
     */
    const releaseManager = function (room: Room, creepName: string) {
        addSpawnTask(room, creepName, roleName, getManagerBody(room.energyAvailable))
    }

    return { manager, releaseManager }
}
