import { WorkTaskContext, WorkerActionStrategy, WorkerGetEnergy, WorkerRuntimeContext } from '../types'

/**
 * 造好新墙时 builder 会先将墙刷到超过下面值，之后才会去建其他建筑
 */
const MIN_WALL_HITS = 8000

/**
 * 建造任务
 */
export const useWorkerBuild = function (
    context: WorkTaskContext,
    getEnergy: WorkerGetEnergy,
    getWorkController: WorkerRuntimeContext
): WorkerActionStrategy {
    return {
        source: getEnergy,
        target: (creep, task, workRoom) => {
            const { removeTaskByKey, countWorkTime } = getWorkController(workRoom)
            countWorkTime()
            if (creep.store[RESOURCE_ENERGY] === 0) {
                delete task.cacheSourceId
                return true
            }

            // 有新墙就先刷新墙
            if (creep.memory.fillWallId) {
                const wall = Game.getObjectById(creep.memory.fillWallId)
                if (!wall || wall.hits > MIN_WALL_HITS) {
                    delete creep.memory.fillWallId
                    return false
                }

                const result = creep.repair(wall)
                if (result === ERR_NOT_IN_RANGE) creep.goTo(wall.pos, { range: 3 })
                return false
            }

            // 没有就建其他工地，如果找不到工地了，就算任务完成
            if (creep.buildRoom(workRoom.name) === ERR_NOT_FOUND) {
                removeTaskByKey(task.key)
                delete task.cacheSourceId
                return true
            }
        }
    }
}
