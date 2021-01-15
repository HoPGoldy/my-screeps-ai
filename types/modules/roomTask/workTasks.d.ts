/**
 * 所有的物流任务类型
 */
type AllWorkTaskType = keyof WorkTasks

/**
 * 所有的房间物流任务
 */
type AllRoomWorkTask = WorkTasks[AllWorkTaskType]

/**
 * 所有的物流任务
 */
interface WorkTasks {
    /**
     * 元素采集任务
     */
    mine: RoomTask<'mine'>
    /**
     * 升级任务
     */
    upgrade: RoomTask<'upgrade'>
    /**
     * 建造任务
     */
    build: RoomTask<'build'>
    /**
     * 维修任务
     */
    repair: RoomTask<'repair'>
    /**
     * 刷墙任务
     */
    fillWall: RoomTask<'fillWall'>
}

/**
 * 从内存 workList 字段解析出来的存储格式
 */
type WorkTaskData = WorkTasks[AllWorkTaskType][]

interface InterfaceWorkTaskController extends InterfaceTaskController<AllWorkTaskType, AllRoomWorkTask> {
    /**
     * 填写一个新的房间物流任务
     */
    addTask(task: AllRoomWorkTask, opt?: AddTaskOpt): void
    /**
     * 根据 taskKey 获取指定任务
     */
    getTask(taskKey: number): AllRoomWorkTask | undefined
    /**
     * 获取应该执行的任务
     */
    getWork(creep: Creep): RoomTaskAction
    /**
     * 是否存在某个任务
     */
    hasTask(taskType: AllWorkTaskType)
    /**
     * 移除一个任务
     */
    removeTask(taskIndex: number | AllWorkTaskType): OK | ERR_NOT_FOUND
    /**
     * 更新指定任务
     */
    updateTask(newTask: AllRoomWorkTask, opt?: UpdateTaskOpt): number
    /**
     * 获取该房间的搬运工调整期望
     */
    getExpect(): number
}

/**
 * 工作任务逻辑的生成函数
 */
type WorkActionGenerator<T extends AllWorkTaskType = AllWorkTaskType> = (
    creep: MyCreep<'worker'>,
    task: WorkTasks[T],
    workController: InterfaceWorkTaskController
) => RoomTaskAction

/**
 * 特殊身体类型
 */
type SepicalBodyType = 'upgrade7' | 'upgrade8'