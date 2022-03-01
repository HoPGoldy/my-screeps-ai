import { DelayTaskData } from '@/modulesGlobal/delayQueue'
import { WorkTaskContext, WorkerActionStrategy, WorkerGetEnergy, WorkTaskType, WorkerRuntimeContext } from '../types'

/**
 * 刷墙任务
 */
export const useWorkerFillWall = function (
    context: WorkTaskContext,
    getEnergy: WorkerGetEnergy,
    getWorkController: WorkerRuntimeContext
): WorkerActionStrategy {
    const { env, withDelayCallback } = context

    /**
     * 当墙刷到上限后，会每隔一段时间回来看看是不是有墙掉回来了
     * 在刷墙任务完成时发布
     */
    const delayAddFillWallTask = withDelayCallback('addFillWallTask', ({ roomName }: DelayTaskData) => {
        const room = Game.rooms[roomName]
        if (!room) return

        room.work.updateTask({ type: WorkTaskType.FillWall }, { dispath: true })
    })

    return {
        source: getEnergy,
        target: (creep, task, workRoom) => {
            const { removeTaskByKey, countWorkTime } = getWorkController(workRoom)
            countWorkTime()

            if (creep.store.getUsedCapacity() === 0) {
                delete task.cacheSourceId
                return true
            }

            const targetWall = creep.room.towerController.getNeedFillWall()
            if (!targetWall) {
                removeTaskByKey(task.key)
                delayAddFillWallTask({ roomName: workRoom.name }, 500)
                return
            }

            // 填充墙壁
            const result = creep.repair(targetWall)
            if (result === ERR_NOT_IN_RANGE) creep.goTo(targetWall.pos, { range: 3 })
            else if (result !== OK) env.log.error(`${creep.name} repair 出错！${result}`)
        }
    }
}
