/**
 * 房间任务基础信息
 * 该任务是物流任务和工作任务的基础
 */
interface RoomTask<T extends string> {
    /**
     * 该任务的类型
     */
    type: T,
    /**
     * 该任务的优先级
     * 若为空则按照发布顺序进行排序
     */
    priority?: number
    /**
     * 该任务的唯一索引
     */
    key?: number
    /**
     * 该任务需要的特殊身体部件
     */
    require?: string
    /**
     * 该任务需要多少人去做
     */
    need?: number
    /**
     * 正在处理该任务的特殊体型单位人数
     * 如果该任务指定了 need 字段的话，该字段也会存在
     */
    needUnit?: number
    /**
     * 正在处理该任务的单位人数
     * 该值包含 needUnit
     */
    unit?: number
}

interface RoomTaskAction {
    /**
     * creep 工作时执行的方法
     */
    target: () => boolean
    /**
     * creep 非工作(收集资源时)执行的方法
     */
    source: () => boolean
}

/**
 * 正在处理任务的 creep
 */
interface TaskUnitInfo {
    /**
     * 该 creep 正在执行的工作
     */
    doing: number
}

/**
 * 新增房间任务时的配置项
 */
interface AddTaskOpt {
    /**
     * 发布任务后是否立刻重新调度
     */
    dispath: boolean
}

/**
 * 基础任务模块的接口规范
 */
interface InterfaceTaskController {
    addTask(task: RoomTask<string>, opt?: AddTaskOpt)
    getTask(taskKey: number): RoomTask<string> | undefined
    hasTask(taskIndex: number | string): boolean
    removeTask(taskIndex: number | string): OK | ERR_NOT_FOUND
    getUnitTaskType(creep: Creep): RoomTask<string>
    removeCreep(creepId): void
}