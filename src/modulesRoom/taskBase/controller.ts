import { createLog } from '@/modulesGlobal/console/utils'
import { getUniqueKey } from '@/utils'
import RoomAccessor from '../RoomAccessor'

export default class TaskController<
    // 该任务模块包含的所有任务类型
    TaskType extends string,
    // 该任务模块包含的所有任务
    CostomTask extends RoomTask<TaskType>
> extends RoomAccessor<RoomTaskMemory<CostomTask>> {
    /**
     * 构造 - 管理指定房间的任务
     * 
     * @param roomName 要管理任务的房间名
     * @param memoryKey 该任务模块保存到的 room 内存字段
     */
    constructor(roomName: string, memoryKey: string) {
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
    public get tasks() {
        return this.memory.tasks
    }

    /**
     * 工人的快捷访问
     */
    public get creeps() {
        return this.memory.creeps
    }

    /**
     * 本模块的工人总生命时长
     */
    protected totalLifeTime: number = 0

     /**
      * 本模块的工人总工作时长
      */
    protected totalWorkTime: number = 0

    /**
     * 发布新任务
     * 
     * @param task 要发布的新任务
     * @param opt 配置项
     */
    public addTask(task: CostomTask, opt: AddTaskOpt = {}) {
        const addOpt: UpdateTaskOpt = { dispath: false }
        Object.assign(addOpt, opt)

        task = this.refineNewTask(task)

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
        if (addOpt.dispath) this.dispatchTask()

        return task.key
    }

    /**
     * 完善新任务
     * 将其他模块输入的任务完善成保存需要的格式
     * 
     * @param task 输入的新任务
     */
    private refineNewTask(task: CostomTask): CostomTask {
        // 设置新索引
        task.key = getUniqueKey()
        task.unit = 0
        // 是特殊任务的话就包含特殊任务处理者数量
        if (!task.require) task.requireUnit = 0
        // 没有指定 need 的话就默认一个人做
        if (!task.need) task.need = 1

        return task
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
    public updateTask(newTask: CostomTask, opt: UpdateTaskOpt = {}): number {
        const updateOpt: UpdateTaskOpt = { addWhenNotFound: true }
        Object.assign(updateOpt, opt)

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
                task.need !== newTask.need ||
                task.require !== newTask.require
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
    public getTask(taskKey: number): CostomTask | undefined {
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
    protected setTaskUnit(task: CostomTask, unit: Creep): void {
        if (!task || !unit) return

        task.unit = (task.unit > 0) ? task.unit + 1 : 1
        if (!this.creeps[unit.name]) this.creeps[unit.name] = {}
        this.creeps[unit.name].doing = task.key
        unit.memory.taskKey = task.key

        // 如果是特殊任务的话就更新对应的字段
        if (task.require && unit.memory.bodyType === task.require) {
            task.requireUnit = (task.requireUnit > 0) ? task.requireUnit + 1 : 1
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
        if (unit) {
            if (this.creeps[unit.name]) delete this.creeps[unit.name].doing
            delete unit.memory.taskKey
        }

        if (!task) return
        task.unit = (task.unit < 1) ? 0 : task.unit - 1
        // 如果是特殊任务的话就更新对应的字段
        if (task.require && unit?.memory?.bodyType === task.require) {
            task.requireUnit = (task.requireUnit <= 1) ? 0 : task.requireUnit - 1
        }
    }

    /**
     * 调度 - 重新分配所有 creep
     * 给当前现存的任务按照优先级重新分配 creep
     */
    public dispatchTask() {
        // 先按照优先级降序排序
        this.memory.tasks = _.sortBy(this.tasks, task => -task.priority)

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
        if (this.creeps[creep.name]) delete this.creeps[creep.name].doing
        delete creep.memory.taskKey

        // creep 数量是否大于任务数量（溢出），当所有的任务都有人做时，该值将被置为 true
        // 此时 creep 将会无视人数限制，分配至体型符合的最高优先级任务
        let overflow = false
        for (let i = 0; i < this.tasks.length; i++) {
            const checkTask = this.tasks[i]
            // creep.log(`正在检查新任务 ${i} ${JSON.stringify(checkTask)}`)

            const result = this.isCreepMatchTask(creep, checkTask, overflow)

            // 挤掉了一个普通单位
            // 例如这个特殊任务有普通工人在做，而自己是符合任务的特殊体型，那自己就会挤占他的工作机会
            if (result === TaskMatchResult.NeedRmoveNormal) {
                const creepName = Object.keys(this.creeps).find(name => this.creeps[name].doing === checkTask.key)
                this.removeTaskUnit(checkTask, Game.creeps[creepName])
            }

            // 匹配成功，把单位设置到该任务并结束分派
            if (result === TaskMatchResult.Ok || result === TaskMatchResult.NeedRmoveNormal) {
                this.setTaskUnit(checkTask, creep)
                // creep.log(`领取任务 ${i} ${JSON.stringify(checkTask)}`)
                return checkTask
            }

            // 找到头了，任务都有人做（或者说没有自己适合做还缺人的任务），从头遍历一遍
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
     */
    private isCreepMatchTask(creep: Creep, task: CostomTask, ignoreNeedLimit: boolean): TaskMatchResult {
        const { require, need, unit, requireUnit } = task
        // 该单位是特殊体型，选择对应的特殊任务
        if (creep.memory.bodyType) {
            // 体型和任务不符，下一个
            if (!require || require !== creep.memory.bodyType) return TaskMatchResult.Failed
            // 数量过多，下一个
            if (!ignoreNeedLimit && (requireUnit || 0) >= need) return TaskMatchResult.Failed
            // 特殊任务的工作单位里有普通单位，把普通单位挤掉
            if (unit >= need && (requireUnit || 0) < unit) {
                return TaskMatchResult.NeedRmoveNormal
            }
        }
        // 普通单位只检查人数是否足够（人数溢出后无视此限制）
        else if (!ignoreNeedLimit && unit >= need) return TaskMatchResult.Failed

        return TaskMatchResult.Ok
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
        this.memory.tasks = this.tasks.filter(task => {
            const prop = (typeof taskIndex === 'number') ? 'key' : 'type'
            if (task[prop] !== taskIndex) return true

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
    public getUnitTask(creep: Creep): CostomTask {
        let doingTask = this.getTask(this.creeps[creep.name]?.doing)

        // 还未分配过任务，或者任务已经完成了
        if (!doingTask) {
            doingTask = this.dispatchCreep(creep)

            const workInfo = this.creeps[creep.name] || {}
            workInfo.doing = doingTask?.key
            this.creeps[creep.name] = workInfo
        }

        return doingTask
    }

    /**
     * 获取可用的单位
     * 
     * @param filter 筛选器，接受 creep 数据与 creep 本身，返回是否选择
     */
    public getUnit(filter?: (info: TaskUnitInfo, creep: Creep) => boolean): Creep[] {
        const units: Creep[] = []

        // 给干完活的单位重新分配任务
        for (const creepName in this.creeps) {
            const creep = Game.creeps[creepName]

            // 人不在，有可能是在重新孵化，暂时跳过任务分配
            if (!creep) continue

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
    public removeCreep(creepName: string): void {
        const creepInfo = this.creeps[creepName]
        if (creepInfo) this.removeTaskUnit(this.getTask(creepInfo.doing))
        delete this.creeps[creepName]
    }

    /**
     * 检查 creep 是否被炒鱿鱼了
     */
    public haveCreepBeenFired(creepName: string): boolean {
        const unitInfo = this.creeps[creepName]
        return !unitInfo || unitInfo.fired
    }

    /**
     * 开除某个 creep
     * 被开除的 creep 将会继续工作，直到死掉后将不再继续孵化
     */
    public fireCreep(creepName: string): void {
        if (creepName in this.creeps) this.creeps[creepName].fired = true
    }

    /**
     * 放弃开除某个 creep
     */
    public unfireCreep(creepName: string): void {
        if (creepName in this.creeps) delete this.creeps[creepName].fired
    }

    /**
     * 用于 actions 中 creep 统计工作时长
     */
    public countWorkTime(): void {
        this.totalWorkTime += 1
    }

    /**
     * 输出当前任务队列信息
     */
    public show(): string {
        const logs = [
            `已注册单位 ${Object.keys(this.creeps).join(', ')}`,
            _.padRight('[类型]', 10) + _.padRight('[索引]', 10) + _.padRight('[需求数量]', 10) + _.padRight('[执行数量]', 10) + _.padRight('[优先级]', 10)
        ]

        logs.push(...this.tasks.map(task => (
            _.padRight(task.type, 10) +
            _.padRight(task.key.toString(), 10) +
            _.padRight(task.need.toString(), 10) +
            _.padRight(task.unit.toString(), 10) +
            _.padRight(task.priority?.toString(), 10)
        )))

        return logs.join('\n')
    }
}

/**
 * creep 的任务匹配结果
 */
enum TaskMatchResult {
    /**
     * 匹配成功，可以执行该任务
     */
    Ok,
    /**
     * 匹配成功，但是需要从该任务移除一个普通单位
     */
    NeedRmoveNormal,
    /**
     * 匹配失败，不适合执行该任务
     */
    Failed
}