import TaskController from '../taskBase/controller'
import { runManager } from './runManager'
import { TRANSFER_DEATH_LIMIT } from './runManager/workDeathClear'
import { ManagerData, ManagerState, TaskFinishReason, TransportTask, TransportTaskData } from './types'

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
 * 期望调整的统计下限
 * 因为搬运工调整期望值来源于 totalLifeTime 和 totalWorkTime 的统计数据
 * 当这两个值还太小时会造成期望不够准确
 * 所以在 totalLifeTime 大于该值时才会调整搬运工数量
 */
const REGULATE_LIMIT = 500

export default class RoomTransport extends TaskController<string | number, TransportTaskData, ManagerData> {
    /**
     * 构造- 管理指定房间的工作任务
     *
     * @param roomName 要管理任务的房间名
     */
    constructor (roomName: string) {
        super(roomName, 'transport')
    }

    /**
     * 让该爬执行搬运工任务
     */
    public doManagerWork (creep: Creep): void {
        this.totalLifeTime += 1
        const task = this.getUnitTask(creep)
        if (!task) {
            creep.say('💤')
            return
        }

        this.totalWorkTime += 1

        const { x, y } = creep.pos
        creep.room.visual.text(task.type.toString(), x, y, { opacity: 0.5, font: 0.3 })

        const managerData = this.creeps[creep.name].data
        if (creep.ticksToLive <= TRANSFER_DEATH_LIMIT) managerData.state = ManagerState.DeathClear

        runManager({
            manager: creep,
            workRoom: this.room,
            taskData: task,
            managerData,
            requireFinishTask: reason => this.requireFinishTask(task, reason, creep)
        })
    }

    public addTask (task: RoomTask & TransportTask, opt?: AddTaskOpt) {
        return super.addTask(task, opt)
    }

    /**
     * 申请结束任务
     * 搬运爬应该调用这个方法申请结束任务，由本方法统一检查是否可以结束
     *
     * @param task 要结束的任务
     * @param reason 结束的理由
     * @param requestCreep 申请结束的爬
     */
    public requireFinishTask (task: TransportTaskData, reason: TaskFinishReason, requestCreep: Creep) {
        if (reason === TaskFinishReason.Complete) this.removeTaskByKey(task.key)
        else if (reason === TaskFinishReason.CantFindSource) {
            this.log.error(`找不到资源来源，任务已移除。任务详情：${JSON.stringify(task)}`)
            this.removeTaskByKey(task.key)
        }
        else if (reason === TaskFinishReason.CantFindTarget) {
            this.log.error(`找不到存放目标，任务已移除。任务详情：${JSON.stringify(task)}`)
            this.removeTaskByKey(task.key)
        }
        // 有可能一个爬发现资源不足了，是因为另一个爬已经拿着资源去搬运了
        // 所以这里会判断一下，只有这个任务的所有搬运爬都说资源不足，才会判断是真的资源不足了
        else if (reason === TaskFinishReason.NotEnoughResource) {
            // 解绑请求爬和这个任务，让他去做其他任务
            const requestCreepInfo = this.creeps[requestCreep.name]
            requestCreepInfo.data = { state: ManagerState.ClearRemains }
            this.removeTaskUnit(task, requestCreep)

            // 找到其他正在从事该任务的爬
            const relatedManagers = Object.entries(this.creeps)
                .map<[Creep, TaskUnitInfo<ManagerData>]>(([creepName, info]) => [Game.creeps[creepName], info])
                .filter(([creep, info]) => {
                    return creep && info.doing === task.key && creep.name !== requestCreep.name
                })

            if (relatedManagers.length <= 0) {
                this.log.error(`部分资源数量不足，任务已移除。任务详情：${JSON.stringify(task)}`)
                this.removeTaskByKey(task.key)
            }
        }
    }

    /**
     * 获取当前的搬运工调整期望
     * 返回的整数值代表希望增加（正值）/ 减少（负值）多少搬运工
     * 返回 0 代表不需要调整搬运工数量
     */
    public getExpect (): number {
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
