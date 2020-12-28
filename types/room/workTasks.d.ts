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
     * 能量采集任务
     */
    harvest: RoomTask<'harvest'>
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

interface RoomWorkType {
    /**
     * 填写一个新的房间物流任务
     * 
     * @param task 要添加的物流任务
     */
    addTask(task: AllRoomWorkTask): void 
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
    removeTask(taskType: AllWorkTaskType): OK | ERR_NOT_FOUND
    /**
     * 获取该房间的搬运工调整期望
     */
    getExpect(): number
}

/**
 * 物流搬运任务逻辑的生成函数
 */
type WorkActionGenerator<T extends AllWorkTaskType = AllWorkTaskType> = (
    creep: MyCreep<'manager'>,
    task: WorkTasks[T]
) => RoomTaskAction
