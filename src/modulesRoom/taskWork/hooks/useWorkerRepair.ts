import { useCache } from '@/utils'
import { WorkTaskContext, WorkerActionStrategy, WorkerGetEnergy, WorkerRuntimeContext, WorkTaskType } from '../types'

/**
 * 维修任务
 */
export const useWorkerRepair = function (
    context: WorkTaskContext,
    getEnergy: WorkerGetEnergy,
    getWorkController: WorkerRuntimeContext
): WorkerActionStrategy<WorkTaskType.Repair> {
    const { env, goTo } = context

    return {
        source: getEnergy,
        target: (creep, task, workRoom) => {
            const { removeTaskByKey, countWorkTime } = getWorkController(workRoom)
            countWorkTime()
            if (creep.store[RESOURCE_ENERGY] === 0) {
                delete task.cacheSourceId
                return true
            }

            // 找到受损建筑
            const target: AnyStructure = useCache(() => {
                const damagedStructures = workRoom.find(FIND_STRUCTURES, {
                    filter: s => s.hits < s.hitsMax &&
                        // 墙壁在刷墙任务里维护
                        s.structureType !== STRUCTURE_RAMPART &&
                        s.structureType !== STRUCTURE_WALL
                })

                // 找到最近的受损建筑并更新缓存
                if (damagedStructures.length > 0) return creep.pos.findClosestByRange(damagedStructures)
            }, creep.memory, 'repairStructureId')

            // 没有需要维修的建筑，任务完成
            if (!target) {
                removeTaskByKey(task.key)
                delete task.targetId
                return true
            }

            // 修满了就换建筑
            if (target.hits >= target.hitsMax) delete task.targetId

            const result = creep.repair(target)

            if (result === ERR_NOT_IN_RANGE) goTo(creep, target.pos, { range: 2 })
            else if (result === ERR_NOT_ENOUGH_ENERGY) {
                delete task.cacheSourceId
                return true
            }
            else if (result !== OK) {
                creep.say(`给我修傻了${result}`)
                env.log.error(`${creep.name} 维修任务异常，repair 返回值: ${result}`)
            }
        }
    }
}
