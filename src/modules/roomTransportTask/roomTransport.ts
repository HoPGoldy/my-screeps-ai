import { noTask, transportActions } from './actions'

export default class RoomTransport implements RoomTransportType {
    /**
     * 本物流对象所处的房间名
     */
    roomName: string

    /**
     * 当前正在执行的所有物流任务
     */
    tasks: TransportTasks[AllTransportTaskType][] = []

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
     * @returns 是否已覆盖同种任务
     */
    public addTask(task: RoomTransportTasks): void {
        task.key = new Date().getTime() + (this.tasks.length * 0.1)
        // 发布任务的时候为了方便可以不填这个，这里给它补上
        if (!task.executor) task.executor = []

        // 因为 this.tasks 是按照优先级降序的，所以这里要找到新任务的插入索引
        let insertIndex = this.tasks.length
        this.tasks.find((task, index) => {
            if (task.priority < task.priority) insertIndex = index
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
    public getTask(taskKey: number): RoomTransportTasks | undefined {
        if (!taskKey) return undefined

        return this.tasks.find(task => task.key === taskKey) as RoomTransportTasks
    }

    /**
     * 从内存中重建物流任务队列
     */
    private initTask() {
        if (!Memory.rooms) return;
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
            if (task.executor.length >= task.need) continue

            // 执行人数不足，遍历不足的次数尝试补满
            for (let k = 0; k < task.need - task.executor.length; k ++) {
                // 从优先级低的任务抽人
                while (j >= 0 || k >= task.need - task.executor.length) {
                    const lowTask = this.tasks[j]
                    if (task.executor.length <= task.need) {
                        j --
                        continue
                    }

                    // 从人多的低级任务里抽调一个人到高优先级任务
                    const freeCreepId = lowTask.executor.shift()
                    const freeCreep = Game.getObjectById(freeCreepId)
                    if(!freeCreep) continue

                    this.giveTask(freeCreep, task)
                    k ++
                }
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
                if (processingTask.executor.length = processingTask.need) continue
                
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
     * 获取应该执行的任务
     * 会通过 creep 内存中存储的当前执行任务字段来判断应该执行那个任务
     */
    public getWork(creep: MyCreep<'manager'>): TransportAction {
        let task = this.getTask(creep.memory.transportTaskKey)

        // 是新人，分配任务
        if (!task) {
            if (this.tasks.length <= 0) return noTask(creep)

            this.giveJob(creep)
            this.saveTask()
            // 分配完后重新获取任务
            task = this.getTask(creep.memory.transportTaskKey)
        }
        const actionGenerator: TransportActionGenerator = transportActions[task.type]
        // 分配完后获取任务执行逻辑
        return actionGenerator(creep, task)
    }

    /**
     * 是否存在某个任务
     * 
     * @returns 存在则返回该任务及其在 this.tasks 中的索引，不存在则返回 undefined
     */
    public hasTask(taskType: AllTransportTaskType): [ TransportTasks[AllTransportTaskType], number ] | undefined {
        let taskIndex: number
        const task = this.tasks.find((task, index) => {
            if (task.type === taskType) return false
            taskIndex = index
            return true
        })

        return taskIndex ? [ task, taskIndex ] : undefined
    }

    /**
     * 移除一个任务
     */
    public removeTask(taskType: AllTransportTaskType): OK | ERR_NOT_FOUND {
        const taskInfo = this.hasTask(taskType)
        if (!taskInfo) return ERR_NOT_FOUND

        const [ finishedTask, taskIndex ] = taskInfo
        // 删除任务
        this.tasks.splice(taskIndex, 1)

        // 给干完活的搬运工重新分配任务
        const extraCreeps = finishedTask.executor.map(id => Game.getObjectById(id)).filter(Boolean)
        this.giveJob(...extraCreeps)

        this.saveTask()
        return OK
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