import { WorkTaskType } from '@/modulesRoom'
import { useCache } from '@/utils'
import { WorkTaskContext, WorkerActionStrategy, WorkerRuntimeContext } from '../types'

/**
 * 初始 container 建造任务
 * 和建造任务最大的区别就是这个只会从对应 source 旁的能量获取任务
 * 防止跑 sourceA 取能量造 sourceB 的 conatiner，这会导致浪费很多时间在路上
 */
export const useWorkerBuildStartContainer = function (
    context: WorkTaskContext,
    getWorkController: WorkerRuntimeContext
): WorkerActionStrategy<WorkTaskType.BuildStartContainer> {
    const { env, sourceUtils, goTo } = context

    return {
        source: (creep, task, workRoom) => {
            if (creep.store[RESOURCE_ENERGY] >= 20) return true
            const { removeTaskByKey, countWorkTime } = getWorkController(workRoom)

            const source = env.getObjectById(task.sourceId)
            if (!source || sourceUtils.getContainer(source)) {
                if (!source) env.log.warning(`${creep.name} 找不到 source，container 建造任务移除`)
                removeTaskByKey(task.key)
                return false
            }
            countWorkTime()

            // 建造初始 container 时一无所有，所以只会捡地上的能量来用
            const { energy: droppedEnergy } = sourceUtils.getDroppedInfo(source)
            if (!droppedEnergy || droppedEnergy.amount < 100) {
                creep.say('等待能量回复')
                // 等待时先移动到附近
                goTo(creep, source.pos, { range: 3 })
                return false
            }

            goTo(creep, droppedEnergy.pos, { range: 1 })
            creep.pickup(droppedEnergy)
            return true
        },
        target: (creep, task, workRoom) => {
            const { removeTaskByKey, countWorkTime } = getWorkController(workRoom)

            if (creep.store[RESOURCE_ENERGY] === 0) return true
            countWorkTime()

            // 搜索 source 附近的 container 工地并缓存
            const containerSite = useCache(() => {
                const source = Game.getObjectById(task.sourceId)

                if (!source) {
                    env.log.warning(`${creep.name} 找不到 source，container 建造任务移除`)
                    removeTaskByKey(task.key)
                    return
                }

                // 这里找的范围只要在 creep 的建造范围之内就行
                const containerSites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 2, {
                    filter: site => site.structureType === STRUCTURE_CONTAINER
                })

                // 找不到了，说明任务完成
                if (containerSites.length <= 0) {
                    removeTaskByKey(task.key)
                    return
                }

                return containerSites[0]
            }, task, 'containerId')

            const result = creep.build(containerSite)
            if (result === ERR_NOT_IN_RANGE) creep.goTo(containerSite.pos, { range: 3 })
        }
    }
}
