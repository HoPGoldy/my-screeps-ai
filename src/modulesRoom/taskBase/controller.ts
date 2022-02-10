import { getUniqueKey } from '@/utils'
import { useUnitFire } from './hooks/useUnitFire'
import { useUnitNumberAdjust } from './hooks/useUnitNumberAdjust'
import { AddTaskOpt, DefaultTaskUnitMemory, RoomTask, TaskBaseContext, UpdateTaskOpt } from './types'

/**
 * 创建任务管理模块
 *
 * @generic TaskType 所有可用的任务类型
 * @generic CostomTask 所有任务
 * @generic UnitData 该任务模块包含的单位自定义数据
 */
export const createTaskController = function <
    TaskType extends string | number,
    CostomTask extends RoomTask<TaskType>,
    UnitMemory extends Record<string, any> = Record<string, any>
> (context: TaskBaseContext<CostomTask, UnitMemory>) {
    const { getMemory, env } = context

    /**
     * 获取任务队列
     */
    const getTasks = function () {
        const memory = getMemory()
        if (!memory.tasks) memory.tasks = []
        return memory.tasks
    }

    /**
     * 获取工作单位的内存
     */
    const getUnitMemorys = function () {
        const memory = getMemory()
        if (!memory.creeps) memory.creeps = {}
        return memory.creeps
    }

    const unitFireControl = useUnitFire(getUnitMemorys)
    const unitNumberAdjust = useUnitNumberAdjust(unitFireControl, getUnitMemorys, context)

    /**
     * 本模块的工人总生命时长
     */
    let totalLifeTime = 0

    /**
     * 本模块的工人总工作时长
     */
    let totalWorkTime = 0

    /**
     * 发布新任务
     *
     * @param task 要发布的新任务
     * @param opt 配置项
     */
    const addTask = function (task: CostomTask, opt: AddTaskOpt = {}) {
        const addOpt: UpdateTaskOpt = { dispath: false, ...opt }

        const newTask = {
            ...task,
            key: getUniqueKey(),
            unit: 0
        }

        // 因为 memory.tasks 是按照优先级降序的，所以这里要找到新任务的插入索引
        const tasks = getTasks()
        let insertIndex = tasks.findIndex(existTask => existTask.priority < newTask.priority)
        insertIndex = insertIndex === -1 ? tasks.length : insertIndex

        // 在目标索引位置插入新任务并重新分配任务
        tasks.splice(insertIndex, 0, newTask)
        if (addOpt.dispath) dispatchTask()

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
    const updateTask = function (newTask: CostomTask, opt: UpdateTaskOpt = {}): number {
        const updateOpt = { addWhenNotFound: true, ...opt }

        // 是否找到了要更新的任务
        let notFound = true
        // 是否需要重新分派任务
        let needRedispath = false
        // 要更新任务的索引
        let taskKey = newTask.key

        // 查找并更新任务
        const memory = getMemory()
        memory.tasks = (memory.tasks || []).map(task => {
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
        if (notFound && updateOpt.addWhenNotFound) taskKey = addTask(newTask, updateOpt)
        else if (needRedispath) dispatchTask()

        return taskKey
    }

    /**
     * 通过任务索引获取指定任务
     *
     * @param taskKey 要查询的任务索引
     * @returns 对应的任务，没有的话则返回 undefined
     */
    const getTaskByKey = function (taskKey: number): CostomTask | undefined {
        if (!taskKey) return undefined
        return getTasks().find(task => task.key === taskKey)
    }

    /**
     * 添加单位到指定任务
     * 单位和任务都必须存在
     *
     * @param task 要添加工作单位的任务
     * @param unit 要添加的 creep
     */
    const setTaskUnit = function (task: CostomTask, unit: Creep): void {
        if (!task || !unit) return

        task.unit = (task.unit || 0) + 1
        const unitMemorys = getUnitMemorys()
        if (!unitMemorys[unit.name]) {
            env.log.error(`setTaskUnit 时找不到 ${unit.name} 对应的内存`)
            return
        }
        unitMemorys[unit.name].doing = task.key
    }

    /**
     * 从一个任务中移除一个工作单位
     * 任务和单位都不必存在
     *
     * @param task 要移除工作单位的任务
     * @param unit 要移除的 creep
     */
    const removeTaskUnit = function (task: CostomTask, unit?: Creep): void {
        if (unit) {
            const unitMemorys = getUnitMemorys()
            if (unitMemorys[unit.name]) delete unitMemorys[unit.name].doing
        }

        if (!task) return
        task.unit = (task.unit < 1) ? 0 : task.unit - 1
    }

    /**
     * 调度 - 重新分配所有 creep
     * 给当前现存的任务按照优先级重新分配 creep
     */
    const dispatchTask = function () {
        const memory = getMemory()
        // 先按照优先级降序排序
        memory.tasks = _.sortBy(memory.tasks, task => -task.priority)

        // 获取所有可工作的 creep 并依次重新分配
        const units = getUnit()
        // 先解绑正在做的任务
        units.forEach(creep => {
            const currentTask = getTaskByKey(getUnitMemorys()[creep.name]?.doing)
            removeTaskUnit(currentTask, creep)
        })
        units.forEach(creep => dispatchCreep(creep))
    }

    /**
     * 调度 - 分配指定 creep
     * 请确保要分配的 creep 处于空闲状态（没有关联任务）
     *
     * @param creep 要分配任务的 creep
     * @returns 该 creep 分配到的任务
     */
    const dispatchCreep = function (creep: Creep): CostomTask {
        // creep 数量是否大于任务数量（溢出），当所有的任务都有人做时，该值将被置为 true
        // overflow 为 true 时 creep 将会无视人数限制，分配至最高优先级任务
        let overflow = false
        const tasks = getTasks()
        for (let i = 0; i < tasks.length; i++) {
            const checkTask = tasks[i]
            // creep.log(`正在检查新任务 ${i} ${JSON.stringify(checkTask)}`)

            const matched = isCreepMatchTask(creep, checkTask, overflow)

            // 匹配成功，把单位设置到该任务并结束分派
            if (matched) {
                setTaskUnit(checkTask, creep)
                // creep.log(`领取任务 ${i} ${JSON.stringify(checkTask)}`)
                return checkTask
            }

            // 找到头了，任务都有人做（或者说没有缺人的任务），从头遍历一遍，把自己分给最高优先级任务
            if (i >= tasks.length - 1 && !overflow) {
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
    const isCreepMatchTask = function (creep: Creep, task: CostomTask, ignoreNeedLimit: boolean): boolean {
        // 忽略人数限制的话就直接把单位堆到该任务
        if (ignoreNeedLimit) return true

        // 任务没有指定需要多少，先分配一个
        if (!task.need) return !task.unit
        // 任务指定了需要的任务，一直分配直到到达需要的人数
        else return task.unit < task.need
    }

    /**
     * 是否存在包含指定索引的任务
     */
    const hasTaskWithKey = function (taskKey: number): boolean {
        const tasks = getTasks()
        return !!tasks.find(task => task.key === taskKey)
    }

    /**
     * 是否存在包含指定类型的任务
     */
    const hasTaskWithType = function (taskTyep: TaskType): boolean {
        const tasks = getTasks()
        return !!tasks.find(task => task.type === taskTyep)
    }

    /**
     * 使用任务索引移除任务
     */
    const removeTaskByKey = function (taskKey: number): OK | ERR_NOT_FOUND {
        const memory = getMemory()
        const unitMemorys = getUnitMemorys()

        // 移除任务并收集被移除的任务索引
        const removeTaskIndex = memory.tasks.findIndex(task => task.key === taskKey)
        memory.tasks.splice(removeTaskIndex, 1)

        // 给正在干这个活的单位重新分配任务
        const units = getUnit(({ doing }) => taskKey === doing)
        units.forEach(creep => removeTaskUnit(getTaskByKey(unitMemorys[creep.name]?.doing), creep))
        units.forEach(creep => dispatchCreep(creep))

        return OK
    }

    /**
     * 使用类型移除任务
     * 会移除所有同类型任务
     */
    const removeTaskByType = function (taskType: TaskType): OK | ERR_NOT_FOUND {
        const memory = getMemory()
        const unitMemorys = getUnitMemorys()
        const removeTaskKeys = []

        // 移除任务并收集被移除的任务索引
        memory.tasks = memory.tasks.filter(task => {
            if (task.type !== taskType) return true
            removeTaskKeys.push(task.key)
            return false
        })

        // 给干完活的单位重新分配任务
        const units = getUnit(({ doing }) => removeTaskKeys.includes(doing))
        units.forEach(creep => removeTaskUnit(getTaskByKey(unitMemorys[creep.name]?.doing), creep))
        units.forEach(creep => dispatchCreep(creep))

        return OK
    }

    /**
     * 获取单位的待执行任务
     * @param creep 要获取待执行任务的 creep
     */
    const getUnitTask = function (creep: Creep): CostomTask {
        const tasks = getTasks()
        if (tasks.length <= 0) return undefined

        const unitMemorys = getUnitMemorys()
        let doingTask = getTaskByKey(unitMemorys[creep.name]?.doing)

        // 还未分配过任务，或者任务已经完成了
        if (!doingTask) doingTask = dispatchCreep(creep)

        return doingTask
    }

    /**
     * 获取可用的单位
     *
     * @param filter 筛选器，接受 creep 数据与 creep 本身，返回是否选择
     */
    const getUnit = function (filter?: (info: DefaultTaskUnitMemory, creep: Creep) => boolean): Creep[] {
        const units: Creep[] = []
        const unitMemorys = getUnitMemorys()

        // 给干完活的单位重新分配任务
        for (const creepName in unitMemorys) {
            const creep = env.getCreepByName(creepName)

            // 人没了，解除掉任务，防止分配任务时出现偏差
            if (!creep) {
                removeCreep(creepName)
                continue
            }

            // 如果指定了筛选条件并且筛选没通过则不返回
            if (filter && !filter(unitMemorys[creepName], creep)) continue

            units.push(creep)
        }

        return units
    }

    /**
     * 移除一个工作单位
     *
     * @param creepName 要移除的 creep 名称
     */
    const removeCreep = function (creepName: string): void {
        const unitMemorys = getUnitMemorys()
        if (unitMemorys[creepName]) {
            removeTaskUnit(getTaskByKey(unitMemorys[creepName].doing))
        }
        delete unitMemorys[creepName]
    }

    /**
     * 总工作时长 + 1
     */
    const countWorkTime = function (): void {
        totalWorkTime += 1
    }

    /**
     * 总生命时长 + 1
     */
    const countLifeTime = function (): void {
        totalLifeTime += 1
    }

    /**
     * 输出当前任务队列信息
     */
    const show = function (): string {
        const pad = content => _.padRight((content || '').toString(), 17)
        const unitMemorys = getUnitMemorys()
        const tasks = getTasks()

        const logs = [
            `已注册单位 ${Object.keys(unitMemorys).join(', ')}`,
            pad('[TYPE]') + pad('[KEY]') + pad('[NEED]') + pad('[UNIT]') + pad('[PRIORITY]')
        ]

        logs.push(...tasks.map(task => (
            pad(task.type) +
            pad(task.key) +
            pad(task.need || '-') +
            pad(task.unit || 0) +
            pad(task.priority || '-')
        )))

        return logs.join('\n')
    }

    return {
        totalLifeTime, totalWorkTime, getTasks, addTask, updateTask, getTaskByKey, removeTaskUnit,
        dispatchTask, hasTaskWithKey, hasTaskWithType, removeTaskByKey, removeTaskByType,
        getUnitTask, getUnit, removeCreep, countWorkTime, countLifeTime, show,
        ...unitNumberAdjust, ...unitFireControl
    }
}
