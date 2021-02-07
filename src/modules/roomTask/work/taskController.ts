import { getRoomStats } from '@/modules/stats'
import { noTask, transportActions } from './actions'
import TaskController from '../baseTaskController'

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
    { rate: 50, expect: 2 },
    { rate: 10, expect: 1 },
    { rate: -10, expect: 0 },
    { rate: -50, expect: -1 },
    { rate: -100, expect: -2 }
]

export default class RoomWork extends TaskController<AllWorkTaskType, AllRoomWorkTask> implements InterfaceWorkTaskController {
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
    public getWork(creep: MyCreep<'worker'>): RoomTaskAction {
        const task = this.getUnitTask(creep)
        if (!task) return noTask(creep)
        const actionGenerator: WorkActionGenerator = transportActions[task.type]

        const { x, y } = creep.pos
        creep.room.visual.text(task.type, x, y, { opacity: 0.4 })
        // 分配完后获取任务执行逻辑
        return actionGenerator(creep, task, this)
    }

    /**
     * 获取当前的工人调整期望
     * 返回的整数值代表希望增加（正值）/ 减少（负值）多少工作单位
     * 返回 0 代表不需要调整工作单位数量
     */
    public getExpect(): number {
        const stats = getRoomStats(this.roomName)
        // 没有统计或者能量获取速率为零，不调整搬运工数量
        if (!stats || !stats.energyGetRate) return 0

        // 工作时长占比从高到底找到期望调整的搬运工数量
        const currentExpect = WORK_PROPORTION_TO_EXPECT.find(opt => stats.energyGetRate >= opt.rate)

        return currentExpect?.expect !== undefined ? currentExpect.expect : -2
    }
}