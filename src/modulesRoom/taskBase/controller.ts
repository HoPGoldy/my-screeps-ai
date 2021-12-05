import { getUniqueKey, createLog } from '@/utils'
import RoomAccessor from '../RoomAccessor'

export default class TaskController<
    // 该任务模块包含的所有任务类型
    TaskType extends string | number,
    // 该任务模块包含的所有任务
    CostomTask extends RoomTask<TaskType>,
    // 该任务模块包含的单位自定义数据
    UnitData extends Record<string, any> = Record<string, any>
> extends RoomAccessor<RoomTaskMemory<CostomTask, UnitData>> {
    /**
     * 构造 - 管理指定房间的任务
     *
     * @param roomName 要管理任务的房间名
     * @param memoryKey 该任务模块保存到的 room 内存字段
     */
    constructor (roomName: string, memoryKey: string) {
        super(`roomTask ${memoryKey}`, roomName, memoryKey, { tasks: [], creeps: {} })
        this.log = createLog('taskController')
    }

    /**
     * 发送日志
     */
    protected log: ReturnType<typeof createLog>

    /**
     * 任务队列的快捷访问
     */
    public get tasks () {
        return this.memory.tasks
    }

    /**
     * 工人的快捷访问
     */
    public get creeps () {
        return this.memory.creeps
    }

    /**
     * 本模块的工人总生命时长
     */
    protected totalLifeTime = 0

    /**
      * 本模块的工人总工作时长
      */
    protected totalWorkTime = 0

    /**
     * 发布新任务
     *
     * @param task 要发布的新任务
     * @param opt 配置项
     */
    public addTask (task: CostomTask, opt: AddTaskOpt = {}) {
        const addOpt: UpdateTaskOpt = { dispath: false, ...opt }

        const newTask = {
            ...task,
            key: getUniqueKey(),
            unit: 0
        }

        // 因为 this.tasks 是按照优先级降序的，所以这里要找到新任务的插入索引
        let insertIndex = this.tasks.findIndex(existTask => existTask.priority < newTask.priority)
        insertIndex = insertIndex === -1 ? this.tasks.length : insertIndex

        // 在目标索引位置插入新任务并重新分配任务
        this.tasks.splice(insertIndex, 0, newTask)
        if (addOpt.dispath) this.dispatchTask()

        return newTask.key
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
    public updateTask (newTask: CostomTask, opt: UpdateTaskOpt = {}): number {
        const updateOpt = { addWhenNotFound: true, ...opt }

        // 是否找到了要更新的任务
        let notFound = true
        // 是否需要重新分派任务
        let needRedispath = false
        // 要更新任务的索引
        let taskKey = newTask.key

        // 查找并更新任务
        this.memory.tasks = this.tasks.map(task => {
            if (task.key !== newTask.key && task.type !== newTask.type) return task

            notFound = false
            taskKey = newTask.key || task.key
            // 状态变化就需要重新分派
            if (
                task.priority !== newTask.priority ||
                task.need !== newTask.need
            ) {
                needRedispath = true
            }

            return Object.assign(task, newTask)
        })

        // 没找到就尝试更新、找到了就尝试重新分配
        if (notFound && updateOpt.addWhenNotFound) taskKey = this.addTask(newTask, updateOpt)
        else if (needRedispath) this.dispatchTask()

        return taskKey
    }

    /**
     * 通过任务索引获取指定任务
     *
     * @param taskKey 要查询的任务索引
     * @returns 对应的任务，没有的话则返回 undefined
     */
    public getTask (taskKey: number): CostomTask | undefined {
        if (!taskKey) return undefined
        return this.tasks.find(task => task.key === taskKey) as CostomTask
    }

    /**
     * 添加单位到指定任务
     * 单位和任务都必须存在
     *
     * @param task 要添加工作单位的任务
     * @param unit 要添加的 creep
     */
    protected setTaskUnit (task: CostomTask, unit: Creep): void {
        if (!task || !unit) return

        task.unit = (task.unit || 0) + 1
        if (!this.creeps[unit.name]) this.creeps[unit.name] = { data: {} as UnitData }
        this.creeps[unit.name].doing = task.key
    }

    /**
     * 从一个任务中移除一个工作单位
     * 任务和单位都不必存在
     *
     * @param task 要移除工作单位的任务
     * @param unit 要移除的 creep
     */
    protected removeTaskUnit (task: CostomTask, unit?: Creep): void {
        if (unit) {
            if (this.creeps[unit.name]) delete this.creeps[unit.name].doing
        }

        if (!task) return
        task.unit = (task.unit < 1) ? 0 : task.unit - 1
    }

    /**
     * 调度 - 重新分配所有 creep
     * 给当前现存的任务按照优先级重新分配 creep
     */
    public dispatchTask () {
        // 先按照优先级降序排序
        this.memory.tasks = _.sortBy(this.tasks, task => -task.priority)

        // 获取所有可工作的 creep 并依次重新分配
        const units = this.getUnit()
        units.forEach(creep => this.dispatchCreep(creep))
    }

    /**
     * 调度 - 分配指定 creep
     * 请确保要分配的 creep 处于空闲状态（没有关联任务）
     *
     * @param creep 要分配任务的 creep
     * @returns 该 creep 分配到的任务
     */
    protected dispatchCreep (creep: Creep): CostomTask {
        // 先解绑正在做的任务
        this.removeTaskUnit(this.getTask(this.creeps[creep.name]?.doing), creep)

        // creep 数量是否大于任务数量（溢出），当所有的任务都有人做时，该值将被置为 true
        // overflow 为 true 时 creep 将会无视人数限制，分配至最高优先级任务
        let overflow = false
        for (let i = 0; i < this.tasks.length; i++) {
            const checkTask = this.tasks[i]
            // creep.log(`正在检查新任务 ${i} ${JSON.stringify(checkTask)}`)

            const matched = this.isCreepMatchTask(creep, checkTask, overflow)

            // 匹配成功，把单位设置到该任务并结束分派
            if (matched) {
                this.setTaskUnit(checkTask, creep)
                // creep.log(`领取任务 ${i} ${JSON.stringify(checkTask)}`)
                return checkTask
            }

            // 找到头了，任务都有人做（或者说没有缺人的任务），从头遍历一遍，把自己分给最高优先级任务
            if (i >= this.tasks.length - 1 && !overflow) {
                overflow = true
                // creep.log("任务溢出！")
                // 这里设置成 -1 的原因是 for 循环的 ++ 在循环结束后执行
                // 而这里的目的是重置循环，所以设置成 -1 后，循环结束时 ++，下个循环刚好从 0 开始
                i = -1
            }
        }
    }

    /**
     * 检查 creep 是否适合去做某个任务
     *
     * @param creep 要匹配的单位
     * @param task 要匹配的任务
     * @param ignoreNeedLimit 是否无视任务的人数限制
     * @returns 返回 true 代表适合去做该任务
     */
    private isCreepMatchTask (creep: Creep, task: CostomTask, ignoreNeedLimit: boolean): boolean {
        // 人数是否超过限制
        return ignoreNeedLimit || task.unit < task.need
    }

    /**
     * 是否存在包含指定索引的任务
     */
    public hasTaskWithKey (taskKey: number): boolean {
        return !!this.tasks.find(task => task.key === taskKey)
    }

    /**
     * 是否存在包含指定类型的任务
     */
    public hasTaskWithType (taskTyep: TaskType): boolean {
        return !!this.tasks.find(task => task.type === taskTyep)
    }

    /**
     * 使用任务索引移除任务
     */
    public removeTaskByKey (taskKey: number): OK | ERR_NOT_FOUND {
        // 移除任务并收集被移除的任务索引
        const removeTaskIndex = this.tasks.findIndex(task => task.key === taskKey)
        this.memory.tasks.splice(removeTaskIndex, 1)

        // 给正在干这个活的单位重新分配任务
        this.getUnit(({ doing }) => taskKey === doing)
            .map(creep => this.dispatchCreep(creep))

        return OK
    }

    /**
     * 使用类型移除任务
     * 会移除所有同类型任务
     */
    public removeTaskByType (taskType: TaskType): OK | ERR_NOT_FOUND {
        const removeTaskKeys = []

        // 移除任务并收集被移除的任务索引
        this.memory.tasks = this.tasks.filter(task => {
            if (task.type !== taskType) return true
            removeTaskKeys.push(task.key)
            return false
        })

        // 给干完活的单位重新分配任务
        this.getUnit(({ doing }) => removeTaskKeys.includes(doing))
            .map(creep => this.dispatchCreep(creep))

        return OK
    }

    /**
     * 获取单位的待执行任务
     * @param creep 要获取待执行任务的 creep
     */
    public getUnitTask (creep: Creep): CostomTask {
        let doingTask = this.getTask(this.creeps[creep.name]?.doing)
        if (this.tasks.length <= 0) return undefined

        // 还未分配过任务，或者任务已经完成了
        if (!doingTask) doingTask = this.dispatchCreep(creep)

        return doingTask
    }

    /**
     * 获取可用的单位
     *
     * @param filter 筛选器，接受 creep 数据与 creep 本身，返回是否选择
     */
    public getUnit (filter?: (info: TaskUnitInfo<UnitData>, creep: Creep) => boolean): Creep[] {
        const units: Creep[] = []

        // 给干完活的单位重新分配任务
        for (const creepName in this.creeps) {
            const creep = Game.creeps[creepName]

            // 人没了，解除掉任务，防止分配任务时出现偏差
            if (!creep) {
                this.removeCreep(creepName)
                continue
            }

            // 如果指定了筛选条件并且筛选没通过则不返回
            if (filter && !filter(this.creeps[creepName], creep)) continue

            units.push(creep)
        }

        return units
    }

    /**
     * 移除一个工作单位
     *
     * @param creepName 要移除的 creep 名称
     */
    public removeCreep (creepName: string): void {
        const creepInfo = this.creeps[creepName]
        if (creepInfo) this.removeTaskUnit(this.getTask(creepInfo.doing))
        delete this.creeps[creepName]
    }

    /**
     * 检查 creep 是否被炒鱿鱼了
     */
    public haveCreepBeenFired (creepName: string): boolean {
        const unitInfo = this.creeps[creepName]
        return !unitInfo || unitInfo.fired
    }

    /**
     * 开除某个 creep
     * 被开除的 creep 将会继续工作，直到死掉后将不再继续孵化
     */
    public fireCreep (creepName: string): void {
        if (creepName in this.creeps) this.creeps[creepName].fired = true
    }

    /**
     * 放弃开除某个 creep
     */
    public unfireCreep (creepName: string): void {
        if (creepName in this.creeps) delete this.creeps[creepName].fired
    }

    /**
     * 用于 actions 中 creep 统计工作时长
     */
    public countWorkTime (): void {
        this.totalWorkTime += 1
    }

    /**
     * 输出当前任务队列信息
     */
    public show (): string {
        const pad = content => _.padRight((content || '').toString(), 12)

        const logs = [
            `已注册单位 ${Object.keys(this.creeps).join(', ')}`,
            pad('[TYPE]') + pad('[KEY]') + pad('[NEED]') + pad('[UNIT]') + pad('[PRIORITY]')
        ]

        logs.push(...this.tasks.map(task => (
            pad(task.type) +
            pad(task.key) +
            pad(task.need) +
            pad(task.unit) +
            pad(task.priority)
        )))

        return logs.join('\n')
    }
}
