import { noTask, transportActions } from './actions'

/**
 * 搬运工工作时长占比到调整期望的 map
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
 * 因为搬运工调整期望值来源于 totalLifeTime 和 totalWorkTime 的统计数据
 * 当这两个值还太小时会造成期望不够准确
 * 所以在 totalLifeTime 大于该值时才会调整搬运工数量
 */
const REGULATE_LIMIT = 500

export default class RoomTransport implements RoomTransportType {
    /**
     * 本物流对象所处的房间名
     */
    readonly roomName: string

    /**
     * 当前正在执行的所有物流任务
     */
    tasks: TransportTasks[AllTransportTaskType][] = []

    /**
     * 本房间的搬运工总生命时长
     */
    totalLifeTime: number = 0

    /**
     * 本房间的搬运工总工作时长
     */
    totalWorkTime: number = 0

    /**
     * 构造- 管理指定房间的物流任务
     * 
     * @param roomName 要管理物流任务的房间名
     */
    constructor(roomName: string) {
        this.roomName = roomName
        this.initTask()
    }

    /**
     * 添加一个物流任务
     * 允许添加多个同类型物流任务，所以如果只想发布唯一任务的话，在发布前需要自行检查是否已经包含任务
     * 
     * @returns 该物流任务的唯一索引
     */
    public addTask(task: RoomTransportTasks): number {
        task.key = new Date().getTime() + (this.tasks.length * 0.1)
        // 发布任务的时候为了方便可以不填这个，这里给它补上
        if (!task.executor) task.executor = []

        // 因为 this.tasks 是按照优先级降序的，所以这里要找到新任务的插入索引
        let insertIndex = this.tasks.length
        this.tasks.find((existTask, index) => {
            if (existTask.priority < task.priority) insertIndex = index
        })

        // 在目标索引位置插入新任务并重新分配任务
        this.tasks.splice(insertIndex, 0, task)
        this.dispatchTask()
        this.saveTask()

        return task.key
    }

    /**
     * 通过任务类型获取指定任务
     * 
     * @param taskType 要查询的任务类型
     * @returns 对应的任务，没有的话则返回 undefined
     */
    public getTask(taskKey: number): RoomTransportTasks | undefined {
        if (!taskKey) return undefined

        return this.tasks.find(task => task.key === taskKey) as RoomTransportTasks
    }

    /**
     * 从内存中重建物流任务队列
     */
    private initTask() {
        if (!Memory.rooms || Memory.rooms[this.roomName]) return;
        // 从内存中解析数据
        const transportTaskDatas: TransportData = JSON.parse(Memory.rooms[this.roomName].transport || '[]')
        this.tasks = transportTaskDatas
    }

    /**
     * 将本房间物流任务都保存至内存
     */
    private saveTask() {
        if (!Memory.rooms) Memory.rooms = {}
        Memory.rooms[this.roomName].transport = JSON.stringify(this.tasks)
    }

    /**
     * 进行任务调度
     * 给当前现存的任务按照优先级重新分配 creep
     */
    private dispatchTask() {
        // 如果优先级高的任务没人做，就从优先级最低的任务开始抽人，尽量保持 creep 执行原来的任务，这里用双指针实现
        let i = 0, j = this.tasks.length - 1

        // 这里没用碰撞指针，是因为有可能存在低优先度任务缺人但是高优先度任务人多的情况
        while (i <= this.tasks.length - 1 || j >= 0) {
            const task = this.tasks[i]
            // 工作人数符合要求，检查下一个
            if (task.executor.length > 0) continue

            // 从优先级低的任务抽人
            while (j >= 0) {
                const lowTask = this.tasks[j]
                // 人手不够，检查优先级略高的任务
                if (lowTask.executor.length <= 0) {
                    j --
                    continue
                }

                // 从人多的低级任务里抽调一个人到高优先级任务
                const freeCreepId = lowTask.executor.shift()
                const freeCreep = Game.getObjectById(freeCreepId)
                // 这里没有 j--，因为这个任务的执行 creep 有可能有两个以上，要重新走一遍流程
                if(!freeCreep) continue

                this.giveTask(freeCreep, task)
            }

            i ++
        }
    }

    /**
     * 给搬运工分配任务
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
        if (creeps.length > 0) {
            for (let i = 0; i < creeps.length; i ++) {
                // 不检查是否缺人，直接分（因为缺人的任务在上面已经分完了）
                this.giveTask(creeps.shift(), this.tasks[i % this.tasks.length])
            }
        }
    }

    /**
     * 获取应该执行的任务逻辑
     * 获取后请在本 tick 直接执行，不要进行存储
     * 会通过 creep 内存中存储的当前执行任务字段来判断应该执行那个任务
     */
    public getWork(creep: MyCreep<'manager'>): TransportAction {
        this.totalLifeTime += 1
        let task = this.getTask(creep.memory.transportTaskKey)

        // 是新人，分配任务
        if (!task) {
            // 这里直接返回了，所以摸鱼时不会增加工作时长
            if (this.tasks.length <= 0) return noTask(creep)

            this.giveJob(creep)
            this.saveTask()
            // 分配完后重新获取任务
            task = this.getTask(creep.memory.transportTaskKey)
        }
        const actionGenerator: TransportActionGenerator = transportActions[task.type]

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
    public hasTask(taskType: AllTransportTaskType): boolean {
        return !!this.tasks.find(task => task.type === taskType)
    }

    /**
     * 移除一个任务
     * 
     * @param taskKey 要移除的任务索引
     */
    public removeTask(taskKey: number): OK | ERR_NOT_FOUND {
        this.tasks = this.tasks.filter(task => {
            if (task.key !== taskKey) return true

            // 给干完活的搬运工重新分配任务
            const extraCreeps = task.executor.map(id => Game.getObjectById(id)).filter(Boolean)
            this.giveJob(...extraCreeps)
            return false
        })

        this.saveTask()
        return OK
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

        return currentExpect?.expect || -2
    }

    /**
     * 给指定 creep 分配任务
     * 
     * @param creep 要分配任务的 creep
     * @param task 该 creep 要执行的任务
     */
    private giveTask(creep: Creep, task: TransportTasks[AllTransportTaskType]): void {
        task.executor.push(creep.id)
        creep.memory.transportTaskKey = task.key
    }
}