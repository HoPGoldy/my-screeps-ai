import { log } from 'utils'
import { getRoomStats } from 'modules/stateCollector'
import { noTask, transportActions } from './actions'
import { HARVEST_MODE } from 'setting'
import TaskController from 'modules/roomTask/baseTaskController'

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
    readonly SAVE_KEY: string = 'workTasks'

    /**
     * 构造- 管理指定房间的工作任务
     * 
     * @param roomName 要管理任务的房间名
     */
    constructor(roomName: string) {
        super(roomName)
    }

    /**
     * 获取应该执行的任务逻辑
     * 会通过 creep 内存中存储的当前执行任务字段来判断应该执行那个任务
     */
    public getWork(creep: MyCreep<'worker'>): RoomTaskAction {
        const task = this.getUnitTaskType(creep)
        const actionGenerator: WorkActionGenerator = transportActions[task.type]

        // 分配完后获取任务执行逻辑
        return actionGenerator(creep, task, this)
    }

    /**
     * 更新指定任务
     * 如果任务包含 key 的话将使用 key 进行匹配
     * 否则的话将更新 taskType 符合的任务（如果包含多个同类型的任务的话则都会更新）
     * 
     * @param newTask 要更新的任务
     * @param addWhenNotFound 当没有匹配到任务时是否新建任务，默认为 true
     * @returns 被更新任务的索引，如果新建了任务则返回新任务的索引，若更新了多个任务的话则返回最后一个任务的索引
     */
    public updateTask(newTask: AllRoomWorkTask, addWhenNotFound: boolean = true): number {
        // 是否找到了要更新的任务
        let notFound = true
        // 是否需要重新分派任务
        let needRedispath = false
        // 要更新任务的索引
        let taskKey = newTask.key

        // 查找并更新任务
        this.tasks = this.tasks.map(task => {
            if (task.key !== newTask.key && task.type !== newTask.type) return task

            notFound = false
            taskKey = newTask.key || task.key
            // 状态变化就需要重新分派
            if (task.priority !== newTask.priority || task.need !== newTask.need) {
                needRedispath = true
            }

            return Object.assign(task, newTask)
        })

        // 没找到就尝试更新、找到了就尝试重新分配
        if (notFound && addWhenNotFound) taskKey = this.addTask(newTask)
        else if (needRedispath) this.dispatchTask()

        return taskKey
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

    /**
     * 规划能量采集任务
     * 该方法会将能量采集任务的优先级设置为 10，请确保其他的任务优先级不会长时间超过该值
     * 
     * 因为能量采集任务设置起来比较麻烦，这里提供一个通用的自适应设置方法（不强制使用，也可以自己实现）
     * 调用一次即可根据房间内的 link、container 之类的设置所有的能量采集任务
     * 如果没有的话将新建任务
     */
    public planEnergyHarvestTask() {
        const room = Game.rooms[this.roomName]
        if (!room) {
            log(`无法访问指定房间 ${this.roomName}，取消能量采集任务规划`, ['workerTask'], 'red')
            return undefined
        }

        // 规划出新的采集任务
        const harvestTasks = room.source.map(source => {
            const task: WorkTasks['harvest'] = {
                type: 'harvest',
                id: source.id,
                mode: HARVEST_MODE.START,
                // 这个很重要，一定要保证这个优先级是最高的
                priority: 10,
                need: 1
            }

            // 找到附近的 link
            const nearLink = room[STRUCTURE_LINK].find(link => source.pos.inRangeTo(link, 2))

            // 有 link，TRANSPORT 模式
            if (nearLink) {
                task.targetId = nearLink.id
                task.mode = HARVEST_MODE.TRANSPORT
                return task
            }

            // 找到附近的 container
            const nearContainer = room[STRUCTURE_CONTAINER].find(container => source.pos.inRangeTo(container, 1))

            // 有 container，SIMPLE 模式
            if (nearContainer) {
                task.targetId = nearContainer.id
                task.mode = HARVEST_MODE.SIMPLE
                return task
            }

            // 啥都没有，起始模式
            return task
        })

        // 找到已经存在的任务并进行配对
        const existHarvestTasks = this.tasks.filter(task => task.type === 'harvest') as WorkTasks['harvest'][]

        for (const newTask of harvestTasks) {
            // 找一下这个 source 对应的上个任务
            const matchedTask = existHarvestTasks.find(task => task.id === newTask.id)

            // 如果有匹配到的任务，直接把新的属性签进去，因为浅拷贝的关系这个修改会同步到 this.tasks 里
            if (matchedTask) Object.assign(matchedTask, newTask)
            // 没找到的话就新建任务
            else this.addTask(newTask)
        }

        const logs = harvestTasks.map(task => `[source ${task.id}] 模式 ${task.mode}`).join(' ')
        room.log(`能量采集规划完成, ${logs}`)
    }
}