import { CreepRole, RoleCreep } from '@/role/types/role'
import TaskController from '../taskBase/controller'
import { noTask, transportActions } from './actions'
import { runManager } from './newAction'
import { AllRoomTransportTask, ManagerData, TaskFinishReason, TransportTaskData, TransportTasks, TransportTaskType } from './types'

/**
 * 搬运工工作时长占比到调整期望的 map
 * 例如工作时长占比为 0.71（71% 的时间都在工作），就会触发 proportion 为 0.7 时对应的 expect 字段
 * 
 * @property {} proportion 工作时长占比
 * @property {} expect 对应的期望
 */
const WORK_PROPORTION_TO_EXPECT = [
    { proportion: 0.9, expect: 2 },
    { proportion: 0.7, expect: 1 },
    { proportion: 0.5, expect: 0 },
    { proportion: 0.3, expect: -1 },
    { proportion: 0, expect: -2 }
]

/**
 * 物流搬运任务逻辑的生成函数
 */
export type TransportActionGenerator<T extends TransportTaskType = TransportTaskType> = (
   creep: RoleCreep<CreepRole.Manager>,
   task: TransportTasks[T],
   transportController: RoomTransport
) => RoomTaskAction

/**
 * 期望调整的统计下限
 * 因为搬运工调整期望值来源于 totalLifeTime 和 totalWorkTime 的统计数据
 * 当这两个值还太小时会造成期望不够准确
 * 所以在 totalLifeTime 大于该值时才会调整搬运工数量
 */
const REGULATE_LIMIT = 500

export default class RoomTransport extends TaskController<TransportTaskType, TransportTaskData, ManagerData> {
    /**
     * 构造- 管理指定房间的工作任务
     * 
     * @param roomName 要管理任务的房间名
     */
    constructor(roomName: string) {
        super(roomName, 'transport')
    }

    /**
     * 获取应该执行的任务逻辑
     * 获取后请在本 tick 直接执行，不要进行存储
     * 会通过 creep 内存中存储的当前执行任务字段来判断应该执行那个任务
     */
    public getWork(creep: RoleCreep<CreepRole.Manager>): RoomTaskAction {
        this.totalLifeTime += 1

        const task = this.getUnitTask(creep)
        if (!task) return noTask(creep)
        // const actionGenerator: TransportActionGenerator = transportActions[task.type]

        // const { x, y } = creep.pos
        // creep.room.visual.text(task.type, x, y, { opacity: 0.5, font: 0.3 })
        // 分配完后获取任务执行逻辑
        // return actionGenerator(creep, task, this)
    }

    /**
     * 让该爬执行搬运工任务
     */
    public doManagerWork(creep: Creep): void {
        this.totalLifeTime += 1
        const task = this.getUnitTask(creep)
        if (!task) {
            creep.say('💤')
            return
        }

        this.totalWorkTime += 1

        const { x, y } = creep.pos
        creep.room.visual.text(task.type, x, y, { opacity: 0.5, font: 0.3 })

        runManager({
            manager: creep,
            workRoom: this.room,
            taskData: task,
            managerData: this.creeps[creep.name].data,
            requireFinishTask: this.requireFinishTask.bind(this)
        })
    }

    /**
     * 申请结束任务
     * 由于可能存在多个爬一起做一个任务，所以会出现某个爬觉得任务完成了，但是其他爬正在做的情况
     * 所以搬运爬应该调用这个方法申请结束任务，由本方法统一检查是否可以结束
     * 
     * @param task 要结束的任务
     * @param reason 结束的理由
     */
    public requireFinishTask(task: TransportTaskData, reason: TaskFinishReason) {
        if (reason === TaskFinishReason.Complete) this.removeTask(task.key)
        else if (reason === TaskFinishReason.CantFindSource) {
            this.log.error(`找不到来源目标 ${JSON.stringify(task.from)}，任务已移除`)
            this.removeTask(task.key)
        }
        else if (reason === TaskFinishReason.CantFindTarget) {
            this.log.error(`找不到存放目标 ${JSON.stringify(task.to)}，任务已移除`)
            this.removeTask(task.key)
        }
        else if (reason === TaskFinishReason.NotEnoughResource) {
            // 找到所有还活着正在从事该任务的搬运工
            const relatedManagers = Object.entries(this.creeps)
                .map<[Creep, TaskUnitInfo<ManagerData>]>(([creepName, info]) => [Game.creeps[creepName], info])
                .filter(([creep, info]) => creep && info.doing === task.key)

            // 找到所有已经完成工作的爬
            const slackoffManagers = relatedManagers.filter(([creep, info]) => {
                const { carry } = info.data
                if (carry?.length <= 0) return true

                // 身上还有资源，说明还在运输，这个爬应该继续执行任务
                const stillWorking = carry.find(carryRes => creep.store[carryRes] > 0)
                return !stillWorking
            })

            // 所有爬手里的活都完成了，结束整个任务
            if (relatedManagers.length === slackoffManagers.length) {
                this.log.error(`部分资源数量不足 ${JSON.stringify(task.res)}，任务已移除`)
                this.removeTask(task.key)
                return
            }

            // 让所有干完活的爬和任务解绑，让其可以重新寻找其他任务
            slackoffManagers.forEach(([creep, info]) => {
                this.removeTaskUnit(this.getTask(info.doing), creep)
            })
        }
    }

    /**
     * 获取当前的搬运工调整期望
     * 返回的整数值代表希望增加（正值）/ 减少（负值）多少搬运工
     * 返回 0 代表不需要调整搬运工数量
     */
    public getExpect(): number {
        // 统计数据还太少，不具备参考性，暂时不调整搬运工数量
        if (this.totalLifeTime < REGULATE_LIMIT) return 0

        // 工作时长占比从高到底找到期望调整的搬运工数量
        const currentExpect = WORK_PROPORTION_TO_EXPECT.find(opt => {
            return (this.totalWorkTime / this.totalLifeTime) >= opt.proportion
        })

        // 计算完成后移除之前的数据，不然会随着基数的增大，变化率会越来越小
        this.totalLifeTime = this.totalWorkTime = 0
        return currentExpect?.expect !== undefined ? currentExpect.expect : -2
    }
}