import { createCache } from '@/utils'
import { createTaskController } from '../taskBaseNew/controller'
import { useWorker } from './hooks/useWorker'
import { AllRoomWorkTask, WorkTasks, WorkTaskType, WorkTaskContext } from './types'

/**
 * 能量获取速率到调整期望的 map
 * 能量获取速率越高，工人数量就越多
 *
 * @property {} rate 能量获取速率
 * @property {} expect 对应的期望
 */
const WORK_PROPORTION_TO_EXPECT = [
    { rate: 10, expect: 2 },
    { rate: 5, expect: 1 },
    { rate: 0, expect: 1 },
    { rate: -5, expect: -1 },
    { rate: -10, expect: -2 }
]

export const createWorkTaskController = function (context: WorkTaskContext) {
    const { getMemory, env } = context

    const lazyLoader = function (roomName: string) {
        const taskController = createTaskController<WorkTaskType, AllRoomWorkTask>({
            unitName: 'worker',
            roomName,
            getMemory: () => getMemory(env.getRoomByName(roomName)),
            getUnitMemory: () => {
                const workRoom = env.getRoomByName(roomName)
                return worker.getUnitMemory(workRoom)
            },
            releaseUnit: creepName => {
                const workRoom = env.getRoomByName(roomName)
                releaseWorker(workRoom, creepName)
            },
            env
        })

        /**
         * 获取当前的工人调整期望
         * 返回的整数值代表希望增加（正值）/ 减少（负值）多少工作单位
         * 返回 0 代表不需要调整工作单位数量
         *
         * @param totalEnergy 可用于使用的能量总量
         * @param energyGetRate 能量获取速率，其值为每 tick 可以获取多少点可用能量
         * （注意，这两个值对应的能量都应是可以完全被用于 worker 消耗的，如果想为孵化保留能量的话，需要从这个速率中剔除）
         */
        const getExpect = function (totalEnergy: number, energyGetRate: number): number {
            // 没有工作任务时慢慢减少工作人数
            const { getTasks, totalLifeTime, totalWorkTime } = taskController
            if (getTasks().length === 0) {
                const workRoom = env.getRoomByName(roomName)
                if (Object.keys(worker.getUnitMemory(workRoom)).length > 0) return -1
                else return 0
            }

            // 没有可以用来工作的能量，慢慢减少工人
            if (totalEnergy <= 0) return -1

            // 有三成时间都在摸鱼，估计是没能量了，慢慢减少工人
            if (totalWorkTime / totalLifeTime < 0.7) return -1

            // 按照能量消耗速率调整工人数量，消耗越快，减少工人越多
            const currentExpect = WORK_PROPORTION_TO_EXPECT.find(opt => energyGetRate >= opt.rate)

            return currentExpect?.expect !== undefined ? currentExpect.expect : -2
        }

        return { run: worker.run, getExpect, ...taskController }
    }

    const [getWorkTaskController] = createCache(lazyLoader)
    const { worker, releaseWorker } = useWorker(context, room => getWorkTaskController(room.name))

    return getWorkTaskController
}

export type WorkTaskController = ReturnType<ReturnType<typeof createWorkTaskController>>
