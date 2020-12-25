import { noTask, transportActions } from './actions'

/**
 * 工人工作时长占比到调整期望的 map
 * 例如工作时长占比为 0.71（71% 的时间都在工作），就会触发 proportion 为 0.7 时对应的 expect 字段
 * 
 * @property {} proportion 工作时长占比
 * @property {} expect 对应的期望
 */
const WORK_PROPORTION_TO_EXPECT = [
    { proportion: 0.9, expect: 2 },
    { proportion: 0.8, expect: 1 },
    { proportion: 0.7, expect: 0 },
    { proportion: 0.4, expect: -1 },
    { proportion: 0, expect: -2 }
]

/**
 * 期望调整的统计下限
 * 因为工人调整期望值来源于 totalLifeTime 和 totalWorkTime 的统计数据
 * 当这两个值还太小时会造成期望不够准确
 * 所以在 totalLifeTime 大于该值时才会调整工人数量
 */
const REGULATE_LIMIT = 500

export default class RoomWork implements RoomWorkType {
    /**
     * 本工作对象所处的房间名
     */
    readonly roomName: string

    /**
     * 当前正在执行的所有工作任务
     */
    tasks: AllRoomWorkTask[] = []

    /**
     * 本房间的工作单位总生命时长
     */
    totalLifeTime: number = 0

    /**
     * 本房间的工作单位总工作时长
     */
    totalWorkTime: number = 0

    /**
     * 构造- 管理指定房间的工作任务
     * 
     * @param roomName 要管理任务的房间名
     */
    constructor(roomName: string) {
        this.roomName = roomName
        this.initTask()
    }

    /**
     * 添加一个工作任务
     * 不允许添加相同类型的任务，若添加时已存在同类型任务将会进行覆盖
     */
    public addTask(task: AllRoomWorkTask): void {
        // 发布任务的时候为了方便可以不填这个，这里给它补上
        if (!task.executor) task.executor = []

        // 如果存在原始任务的话就剔除
        this.tasks = this.tasks.filter(existTask => existTask.type !== task.type)

        // 因为 this.tasks 是按照优先级降序的，所以这里要找到新任务的插入索引
        let insertIndex = this.tasks.length
        this.tasks.find((existTask, index) => {
            // 老任务的优先级更高，不能在这里插入
            if (existTask.priority >= task.priority) return false

            insertIndex = index
            return true
        })

        // 在目标索引位置插入新任务并重新分配任务
        this.tasks.splice(insertIndex, 0, task)
        this.dispatchTask()
        this.saveTask()
    }

    /**
     * 通过任务类型获取指定任务
     * 
     * @param taskType 要查询的任务类型
     * @returns 对应的任务，没有的话则返回 undefined
     */
    public getTask(taskType: AllWorkTaskType): AllRoomWorkTask | undefined {
        if (!taskType) return undefined

        return this.tasks.find(task => task.type === taskType) as AllRoomWorkTask
    }

    /**
     * 从内存中重建任务队列
     */
    private initTask() {
        if (!Memory.rooms || Memory.rooms[this.roomName]) return;
        // 从内存中解析数据
        const taskData: WorkTaskData = JSON.parse(Memory.rooms[this.roomName].workTasks || '[]')
        this.tasks = taskData
    }

    /**
     * 将本房间工作任务都保存至内存
     */
    private saveTask() {
        if (!Memory.rooms) Memory.rooms = {}
        Memory.rooms[this.roomName].workTasks = JSON.stringify(this.tasks)
    }

    /**
     * 进行任务调度
     * 给当前现存的任务按照优先级重新分配 creep
     */
    private dispatchTask() {

    }

    /**
     * 给工作单位分配任务
     * 
     * @param creeps 要分配任务的 creep 
     */
    private giveJob(...creeps: Creep[]) {
        // 把执行该任务的 creep 分配到缺人做的任务上
        if (creeps.length > 0) {
            for (const processingTask of this.tasks) {
                if (processingTask.executor.length > 0) continue

                // 当前任务缺人
                this.giveTask(creeps.shift(), processingTask)
                if (creeps.length <= 0) break
            }
        }

        // 还没分完的话就依次分给优先度高的任务
        let i = 0
        while (creeps.length > 0) {
            // 不检查是否缺人，直接分（因为缺人的任务在上面已经分完了）
            this.giveTask(creeps.shift(), this.tasks[i % this.tasks.length])
            i ++
        }
    }

    /**
     * 获取应该执行的任务逻辑
     * 获取后请在本 tick 直接执行，不要进行存储
     * 会通过 creep 内存中存储的当前执行任务字段来判断应该执行那个任务
     */
    public getWork(creep: MyCreep<'manager'>): RoomTaskAction {
        this.totalLifeTime += 1
        let task = this.getTask(creep.memory.workTaskType)

        // 是新人，分配任务
        if (!task) {
            // 这里直接返回了，所以摸鱼时不会增加工作时长
            if (this.tasks.length <= 0) return noTask(creep)

            this.giveJob(creep)
            this.saveTask()
            // 分配完后重新获取任务
            task = this.getTask(creep.memory.workTaskType)
        }
        const actionGenerator: WorkActionGenerator = transportActions[task.type]

        // 这里增加工作时长，所以要在本 tick 执行下面的逻辑，就算不执行也会被认为在工作
        this.totalWorkTime += 1
        // 分配完后获取任务执行逻辑
        return actionGenerator(creep, task)
    }

    /**
     * 是否存在某个任务
     * 
     * @returns 存在则返回该任务及其在 this.tasks 中的索引，不存在则返回 undefined
     */
    public hasTask(taskType: AllWorkTaskType): boolean {
        return !!this.tasks.find(task => task.type === taskType)
    }

    /**
     * 移除一个任务
     * 
     * @param taskType 要移除的任务类型
     */
    public removeTask(taskType: AllWorkTaskType): OK | ERR_NOT_FOUND {
        this.tasks = this.tasks.filter(task => {
            if (task.type !== taskType) return true

            // 给干完活的搬运工重新分配任务
            const extraCreeps = task.executor.map(id => Game.getObjectById(id)).filter(Boolean)
            this.giveJob(...extraCreeps)
            return false
        })

        this.saveTask()
        return OK
    }

    /**
     * 获取当前的工人调整期望
     * 返回的整数值代表希望增加（正值）/ 减少（负值）多少工作单位
     * 返回 0 代表不需要调整工作单位数量
     */
    public getExpect(): number {
        return 0
    }

    /**
     * 给指定 creep 分配任务
     * 
     * @param creep 要分配任务的 creep
     * @param task 该 creep 要执行的任务
     */
    private giveTask(creep: Creep, task: AllRoomWorkTask): void {
        task.executor.push(creep.id)
        creep.memory.transportTaskKey = task.key
    }
}