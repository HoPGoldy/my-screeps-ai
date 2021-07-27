import { noTask, transportActions } from './actions'
import TaskController from '../taskBase/controller'
import { AllRoomWorkTask, WorkTasks, WorkTaskType } from './types'
import { CreepRole, RoleCreep } from '@/role/types/role'

/**
 * 能量获取速率到调整期望的 map
 * 能量获取速率越高，工人数量就越多
 * 
 * @todo 下面的速率到期望的值还需要实测确定
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

/**
 * 工作任务逻辑的生成函数
 */
export type WorkActionGenerator<T extends WorkTaskType = WorkTaskType> = (
    creep: RoleCreep<CreepRole.Worker>,
    task: WorkTasks[T],
    workController: RoomWork
) => RoomTaskAction

export default class RoomWork extends TaskController<WorkTaskType, AllRoomWorkTask> {
    /**
     * 构造- 管理指定房间的工作任务
     * 
     * @param roomName 要管理任务的房间名
     */
    constructor(roomName: string) {
        super(roomName, 'work')
    }

    /**
     * 获取应该执行的任务逻辑
     * 会通过 creep 内存中存储的当前执行任务字段来判断应该执行那个任务
     */
    public getWork(creep: RoleCreep<CreepRole.Worker>): RoomTaskAction {
        const task = this.getUnitTask(creep)
        if (!task) return noTask(creep)
        const actionGenerator: WorkActionGenerator = transportActions[task.type]

        const { x, y } = creep.pos
        creep.room.visual.text(task.type, x, y, { opacity: 0.5, font: 0.3 })
        // 分配完后获取任务执行逻辑
        return actionGenerator(creep, task, this)
    }

    /**
     * 获取当前的工人调整期望
     * 返回的整数值代表希望增加（正值）/ 减少（负值）多少工作单位
     * 返回 0 代表不需要调整工作单位数量
     * 
     * @param totalEnergy 可用于使用的能量总量
     * @param energyGetRate 能量获取速率，其值为每 tick 可以获取多少点可用能量
     * （注意，这两个值对应的能量都应是可以完全被用于 worker 消耗的，如果想为孵化保留能量的话，需要从这个速率中剔除）
     */
    public getExpect(totalEnergy: number, energyGetRate: number): number {
        // 没有工作任务时慢慢减少工作人数
        if (this.tasks.length === 0) {
            if (Object.keys(this.creeps).length > 0) return -1
            else return 0
        }

        // 这时候能量速率也保持为 0 的，但是没能量可用，所以减少工人
        if (totalEnergy <= 0) return -1

        // 工作时长占比从高到底找到期望调整的搬运工数量
        const currentExpect = WORK_PROPORTION_TO_EXPECT.find(opt => energyGetRate >= opt.rate)

        return currentExpect?.expect !== undefined ? currentExpect.expect : -2
    }
}