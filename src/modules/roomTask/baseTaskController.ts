/**
 * 任务模块核心实现
 * 接受的两个泛型含义为：TaskType：所有任务类型，CostomTask 所有任务
 * 
 * 模块实现了任务的添加、排序、删除，以及工作 creep 的分配
 */

export default class TaskController<TaskType extends string, CostomTask extends RoomTask<TaskType>> implements InterfaceTaskController {
    /**
     * 本任务对象所处的房间名
     */
    readonly roomName: string

    /**
     * 该模块需要的数据将被保存到 room.memory 的哪个键下
     */
    readonly SAVE_KEY: string = ''

    /**
     * 该模块负责的任务
     */
    tasks: CostomTask[] = []

    /**
     * 当前正在执行任务的 creep
     */
    creeps: { [creepId: string]: TaskUnitInfo } = {}

    /**
     * 构造 - 管理指定房间的任务
     * 
     * @param roomName 要管理任务的房间名
     */
    constructor(roomName: string) {
        this.roomName = roomName
        this.initTask()
    }

    /**
     * 发布新任务
     * 
     * @param task 要发布的新任务
     * @param opt 配置项
     */
    public addTask(task: CostomTask, opt: AddTaskOpt = { dispath: true }) {
        task.key = new Date().getTime() + (this.tasks.length * 0.1)
        // 发布任务的时候为了方便可以不填这些，这里给它补上
        if (!task.need) task.needUnit = 0
        task.unit = 0

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
        if (opt.dispath) this.dispatchTask()
        this.saveTask()

        return task.key
    }

    /**
     * 通过任务索引获取指定任务
     * 
     * @param taskKey 要查询的任务索引
     * @returns 对应的任务，没有的话则返回 undefined
     */
    public getTask(taskKey: number): CostomTask | undefined {
        if (!taskKey) return undefined
        return this.tasks.find(task => task.key === taskKey) as CostomTask
    }

    /**
     * 从内存中重建物流任务队列
     */
    protected initTask() {
        if (!Memory.rooms || Memory.rooms[this.roomName]) return
        // 从内存中解析数据
        this.tasks = JSON.parse(Memory.rooms[this.roomName][this.SAVE_KEY] || '[]')
    }

    /**
     * 将本房间物流任务都保存至内存
     */
    protected saveTask() {
        if (!Memory.rooms) Memory.rooms = {}
        Memory.rooms[this.roomName][this.SAVE_KEY] = JSON.stringify(this.tasks)
    }

    /**
     * 添加单位到指定任务
     * 单位和任务都必须存在
     * 
     * @param task 要添加工作单位的任务
     * @param unit 要添加的 creep
     */
    protected setTaskUnit(task: CostomTask, unit: Creep): void {
        if (!task || !unit) return
        unit.memory.taskKey = task.key

        task.unit = (task.unit > 0) ? task.unit + 1 : 1
        // 如果是特殊任务的话就更新对应的字段
        if (task.require && unit.memory.bodyType === task.require) {
            task.needUnit = (task.needUnit > 0) ? task.needUnit + 1 : 1
        }
    }

    /**
     * 从一个任务中移除一个工作单位
     * 任务和单位都不必存在
     * 
     * @param task 要移除工作单位的任务
     * @param unit 要移除的 creep
     */
    protected removeTaskUnit(task: CostomTask, unit?: Creep): void {
        if (unit.memory) delete unit.memory.taskKey
        if (!task) return

        task.unit = (task.unit <= 1) ? 0 : task.unit - 1
        // 如果是特殊任务的话就更新对应的字段
        if (task.require && unit.memory.bodyType === task.require) {
            task.needUnit = (task.needUnit <= 1) ? 0 : task.needUnit - 1
        }
    }

    /**
     * 调度 - 重新分配所有 creep
     * 给当前现存的任务按照优先级重新分配 creep
     */
    protected dispatchTask() {
        // 先按照优先级降序排序
        this.tasks = _.sortBy(this.tasks, task => -task.priority)

        // 获取所有可工作的 creep，并解除与对应工作任务的绑定
        const units = this.getUnit(({ doing }, creep) => {
            this.removeTaskUnit(this.getTask(doing), creep)
            return true
        })

        // 等待分配任务的 creep 队列
        // [0] 为具有特殊体型的 creep，将优先分配
        // [1] 为普通体型的 creep，将在特殊体型的分配完后“填缝”
        const waitDispatchList = [ [], [] ]
        // 用已有 creep 填充待分配队列
        for (const creep of units) {
            const type = creep.memory.bodyType ? 0 : 1
            waitDispatchList[type].push(creep)
        }

        // 给每个 creep 重新分配任务
        waitDispatchList.map(creepList => creepList.map(creep => this.dispatchCreep(creep)))
    }

    /**
     * 调度 - 分配指定 creep
     * 请确保要分配的 creep 处于空闲状态（没有关联任务）
     * 
     * @param creep 要分配任务的 creep 
     * @returns 该 creep 分配到的任务
     */
    protected dispatchCreep(creep: Creep): CostomTask {
        // creep 数量是否大于任务数量（溢出），当所有的任务都有人做时，该值将被置为 true
        // 此时 creep 将会无视人数限制，分配至体型符合的最高优先级任务
        let overflow = false

        for (let i = 0; i < this.tasks.length; i++) {
            const checkTask = this.tasks[i]

            // 找到头了，任务都有人做（或者说没有自己适合做还缺人的任务），从头遍历一遍
            if (i >= this.tasks.length - 1 && !overflow) {
                overflow = true
                i = 0
            }

            // 该任务的人数已经够了，下一个，如果数量溢出了则无视此限制
            if (!overflow || checkTask.unit >= (checkTask.need || 1)) continue
            // 该单位是特殊体型，选择对应的特殊任务
            if (creep.memory.bodyType) {
                if (!checkTask.require || checkTask.require !== creep.memory.bodyType) continue
            }

            // 符合条件，分配到该任务
            this.setTaskUnit(checkTask, creep)
            return checkTask
        }
    }

    /**
     * 是否存在某个（种）任务
     * 
     * @returns 存在则返回 true，不存在返回 false
     */
    public hasTask(taskIndex: number | TaskType): boolean {
        // 用任务类型判断
        if (typeof taskIndex === 'string') return !!this.tasks.find(task => task.type === taskIndex)
        // 用任务索引判断
        else return !!this.tasks.find(task => task.key === taskIndex)
    }

    /**
     * 移除一个任务
     * 
     * @param taskKey 要移除的任务索引（key 或者 type）
     */
    public removeTask(taskIndex: number): OK | ERR_NOT_FOUND
    public removeTask(taskIndex: TaskType): OK | ERR_NOT_FOUND
    public removeTask(taskIndex: number | TaskType): OK | ERR_NOT_FOUND {
        const removeTaskKeys = []

        // 移除任务并收集被移除的任务索引
        this.tasks = this.tasks.filter(task => {
            const prop = (typeof taskIndex === 'number') ? 'key' : 'type'
            if (task[prop] !== taskIndex) return true

            removeTaskKeys.push(task.key)
            return false
        })

        // 给干完活的单位重新分配任务
        this.getUnit(({ doing }) => removeTaskKeys.includes(doing))
            .map(creep => this.dispatchCreep(creep))

        this.saveTask()
        return OK
    }

    /**
     * 获取单位的待执行任务
     * @param creep 要获取待执行任务的 creep
     */
    public getUnitTaskType(creep: Creep): CostomTask {
        if (this.creeps[creep.id]) return this.getTask(this.creeps[creep.id].doing)

        // 还未分配过任务
        const { key } = this.dispatchCreep(creep)
        this.creeps[creep.id] = { doing: key }
    }

    /**
     * 获取可用的单位
     * 如果单位死掉了的话将直接移除
     * 
     * @param filter 筛选器，接受 creep 数据与 creep 本身，返回是否选择
     */
    protected getUnit(filter?: (info: TaskUnitInfo, creep: Creep) => boolean): Creep[] {
        const units: Creep[] = []

        // 给干完活的单位重新分配任务
        for (const creepId in this.creeps) {
            const { doing } = this.creeps[creepId]
            const creep = Game.getObjectById(creepId as Id<Creep>)

            // 人没了，直接移除
            if (!creep) {
                this.removeCreep(creepId)
                continue
            }

            // 如果指定了筛选条件并且筛选没通过则不返回
            if (filter && !filter(this.creeps[creepId], creep)) continue

            units.push(creep)
        }

        return units
    }

    /**
     * 移除一个工作单位
     * 不调用的话也不影响模块运行（任务调度时会自行清理）
     * 在对应工作单位去世时主动调用可以获得更准确的任务分派
     * 
     * @param creepId 要移除的 creep id
     */
    public removeCreep(creepId): void {
        const { doing } = this.creeps[creepId]
        delete this.creeps[creepId]

        this.removeTaskUnit(this.getTask(doing))
    }
}