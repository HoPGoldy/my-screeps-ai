import { AddTaskOpt, createTaskController, DefaultTaskUnitMemory, RoomTask } from '../taskBase'
import { createCache } from '@/utils'
import { ManagerData, ManagerState, TaskFinishReason, TransportContext, TransportTask, TransportTaskMemory } from './types'
import { DEFAULT_ROLE_NAME, REGULATE_LIMIT, WORK_PROPORTION_TO_EXPECT } from './constants'
import { useManager } from './hooks/useManager'

/**
 * 创建物流任务管理模块
 *
 * @param context 物流管理模块所需的依赖
 * @returns 物流管理模块实例
 */
export const createTransportController = function (context: TransportContext) {
    const { getMemory, roleName = DEFAULT_ROLE_NAME, env } = context

    const lazyLoader = function (roomName: string) {
        const taskController = createTaskController<string | number, TransportTaskMemory, ManagerData>({
            env, roleName, roomName,
            getMemory: () => getMemory(env.getRoomByName(roomName)),
            releaseUnit: creepName => {
                const workRoom = env.getRoomByName(roomName)
                releaseManager(workRoom, creepName)
            }
        })

        const addTask = function (task: RoomTask & TransportTask, opt?: AddTaskOpt) {
            const emptyRequest = []
            // 剔除掉 amount 为 0 的物流请求
            task.requests = task.requests.filter(request => {
                if (request.amount > 0 || request.amount === undefined) return true
                emptyRequest.push(request)
                return false
            })

            if (emptyRequest.length > 0) {
                const log = `发现如下容量不正确的物流请求，已剔除：${emptyRequest.map(request => JSON.stringify(request))}`
                env.log.warning(log)
            }
            if (task.requests.length <= 0) return -1

            return taskController.addTask(task, opt)
        }

        /**
         * 申请结束任务
         * 搬运爬应该调用这个方法申请结束任务，由本方法统一检查是否可以结束
         *
         * @param task 要结束的任务
         * @param reason 结束的理由
         * @param requestCreep 申请结束的爬
         */
        const requireFinishTask = function (task: TransportTaskMemory, reason: TaskFinishReason, requestCreep: Creep) {
            // console.log('申请结束搬运任务', JSON.stringify(task), reason, requestCreep)
            const { removeTaskByKey, removeTaskUnit } = taskController

            if (reason === TaskFinishReason.Complete) removeTaskByKey(task.key)
            else if (reason === TaskFinishReason.CantFindSource) {
                env.log.error(`${roomName} 找不到资源来源，任务已移除。任务详情：${JSON.stringify(task)}`)
                removeTaskByKey(task.key)
            }
            else if (reason === TaskFinishReason.CantFindTarget) {
                env.log.error(`找不到存放目标，任务已移除。任务详情：${JSON.stringify(task)}`)
                removeTaskByKey(task.key)
            }
            // 有可能一个爬发现资源不足了，是因为另一个爬已经拿着资源去搬运了
            // 所以这里会判断一下，只有这个任务的所有搬运爬都说资源不足，才会判断是真的资源不足了
            else if (reason === TaskFinishReason.NotEnoughResource) {
                const { creeps: unitMemorys = {} } = getMemory(env.getRoomByName(roomName))

                // 解绑请求爬和这个任务，让他去做其他任务
                const requestCreepInfo = unitMemorys[requestCreep.name]
                requestCreepInfo.state = ManagerState.ClearRemains
                removeTaskUnit(task, requestCreep)

                // 找到其他正在从事该任务的爬
                const relatedManagers = Object.entries(unitMemorys)
                    .map<[Creep, DefaultTaskUnitMemory]>(([creepName, data]) => {
                        return [Game.creeps[creepName], data]
                    })
                    .filter(([creep, info]) => {
                        return creep && info.doing === task.key && creep.name !== requestCreep.name
                    })

                if (relatedManagers.length <= 0) {
                    env.log.error(`部分资源数量不足，任务已移除。任务详情：${JSON.stringify(task)}`)
                    removeTaskByKey(task.key)
                }
            }
        }

        /**
         * 获取当前的搬运工调整期望
         * 返回的整数值代表希望增加（正值）/ 减少（负值）多少搬运工
         * 返回 0 代表不需要调整搬运工数量
         */
        const getExpect = function (): number {
            const { totalLifeTime, totalWorkTime } = taskController
            // 统计数据还太少，不具备参考性，暂时不调整搬运工数量
            if (taskController.totalLifeTime < REGULATE_LIMIT) return 0

            // 工作时长占比从高到底找到期望调整的搬运工数量
            const currentExpect = WORK_PROPORTION_TO_EXPECT.find(opt => {
                return (totalWorkTime / totalLifeTime) >= opt.proportion
            })
            // console.log('物流新期望: ', this.totalLifeTime, this.totalWorkTime, this.totalWorkTime / this.totalLifeTime, JSON.stringify(currentExpect))
            // 计算完成后移除之前的数据，不然会随着基数的增大，变化率会越来越小
            taskController.totalLifeTime = taskController.totalWorkTime = 0
            return currentExpect?.expect !== undefined ? currentExpect.expect : -2
        }

        /**
         * 【入口】执行物流模块逻辑
         */
        const run = function () {
            const workRoom = env.getRoomByName(roomName)
            manager.run(workRoom)
        }

        return { run, getExpect, requireFinishTask, ...taskController, addTask }
    }

    const [getTransportController] = createCache(lazyLoader)
    const { manager, releaseManager } = useManager(context, room => getTransportController(room.name))

    return getTransportController
}

export type TransportController = ReturnType<ReturnType<typeof createTransportController>>
