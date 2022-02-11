import { createCache } from '@/utils'
import { createTaskController } from '../taskBase/controller'
import { DEFAULT_ROLE_NAME, WORK_PROPORTION_TO_EXPECT, WORK_TASK_PRIOIRY } from './constants'
import { useWorker } from './hooks/useWorker'
import { AllRoomWorkTask, WorkTaskType, WorkTaskContext } from './types'

interface BuildDelayTaskData {
    roomName: string
    need?: number
}

/**
 * 【主要】创建工作任务管理模块
 *
 * @param context 工作任务管理模块所需的依赖
 * @returns 任务管理模块实例
 */
export const createWorkController = function (context: WorkTaskContext) {
    const { getMemory, withDelayCallback, roleName = DEFAULT_ROLE_NAME, env } = context

    const delayAddBuildTask = withDelayCallback('addBuildTask', ({ roomName, need }: BuildDelayTaskData) => {
        const room = Game.rooms[roomName]
        // 如果没有工地的话就创建并再次发布建造任务
        if (!room) {
            delayAddBuildTask({ roomName }, 2)
            return
        }

        // 发布建筑
        room.work.updateTask({
            type: WorkTaskType.Build, need, priority: WORK_TASK_PRIOIRY.BUILD
        }, { dispath: true })
    })

    const lazyLoader = function (roomName: string) {
        const taskController = createTaskController<WorkTaskType, AllRoomWorkTask>({
            env, roleName, roomName,
            getMemory: () => getMemory(env.getRoomByName(roomName)),
            releaseUnit: creepName => {
                const workRoom = env.getRoomByName(roomName)
                releaseWorker(workRoom, creepName)
            }
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
                const memory = getMemory(workRoom)
                if (Object.keys(memory.creeps || {}).length > 0) return -1
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

        /**
         * 添加工地建造任务
         * 因为工地在下个 tick 才能被发现，所以需要延迟任务
         *
         * @param need 需要多少人参加，默认为所有空闲单位都参加
         */
        const addBuildTask = (need?: number) => delayAddBuildTask({ roomName, need }, 2)

        /**
         * 想指定房间发送支援工人
         *
         * @param supportRoomName 要支援的房间
         * @param supportNumber 要孵化的支援单位数量
         */
        const supportRoom = function (supportRoomName: string, supportNumber: number) {
            for (let i = 0; i < supportNumber; i++) {
                releaseWorker(env.getRoomByName(roomName), `${supportRoomName} s${roleName}${i}`)
            }
        }

        /**
         * 【入口】执行工作模块逻辑
         */
        const run = function () {
            const workRoom = env.getRoomByName(roomName)
            worker.run(workRoom)
        }

        return { run, getExpect, addBuildTask, supportRoom, ...taskController }
    }

    const [getWorkController] = createCache(lazyLoader)
    const { worker, releaseWorker } = useWorker(context, room => getWorkController(room.name))

    return getWorkController
}

export type WorkController = ReturnType<ReturnType<typeof createWorkController>>
