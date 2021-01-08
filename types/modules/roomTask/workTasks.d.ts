/**
 * 所有的物流任务类型
 */
type AllWorkTaskType = keyof WorkTasks

/**
 * 所有的房间物流任务
 */
type AllRoomWorkTask = WorkTasks[AllWorkTaskType]

// 三种采集单位行为

/**
 * 采集行为：启动模式
 * 会采集能量然后运送会 spawn 和 extension
 */
type HarvestModeStart = 1
/**
 * 采集行为：简单模式
 * 会无脑采集能量，配合 container 使用
 */
type HarvestModeSimple = 2
/**
 * 采集行为：转移模式
 * 会采集能量然后存放到指定建筑，配合 link 使用
 */
type HarvestModeTransport = 3

/**
 * 所有能量采集单位的行为模式
 */
type HarvestMode = HarvestModeStart | HarvestModeSimple | HarvestModeTransport

/**
 * 所有的物流任务
 */
interface WorkTasks {
    /**
     * 能量采集任务
     */
    harvest: RoomTask<'harvest'> & {
        /**
         * 要采集的 source id
         */
        id: Id<Source>
        /**
         * 在非初始模式下要存放能量到的位置
         */
        targetId?: Id<StructureLink | StructureContainer>
        /**
         * 采集的行为模式
         */
        mode: HarvestMode
    }
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

interface InterfaceWorkTaskController extends InterfaceTaskController {
    /**
     * 填写一个新的房间物流任务
     */
    addTask(task: AllRoomWorkTask): void
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
    updateTask(newTask: AllRoomWorkTask, addWhenNotFound?: boolean): number
    /**
     * 获取该房间的搬运工调整期望
     */
    getExpect(): number
    /**
     * 自动规划能量采集任务
     */
    planEnergyHarvestTask(): void
}

/**
 * 工作任务逻辑的生成函数
 */
type WorkActionGenerator<T extends AllWorkTaskType = AllWorkTaskType> = (
    creep: MyCreep<'worker'>,
    task: WorkTasks[T],
    taskKey: number,
    workController: InterfaceWorkTaskController
) => RoomTaskAction

/**
 * 特殊身体类型
 */
type SepicalBodyType = 'upgrade7' | 'upgrade8' | 'harvestSimple'