interface Room {
    /**
     * 房间工作 api
     */
    work: InterfaceWorkTaskController
}

interface RoomMemory {
    /**
     * 房间工作任务的备份数据
     * 会在全局重置时通过该数据重建工作任务
     */
    workTasks: string
    /**
     * 正在执行工作任务的 creep 的数据
     */
    workCreeps: string
}

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
    build: RoomTask<'build'> & {
        targetId?: Id<ConstructionSite>
    }
    /**
     * 初始 source container 建造任务
     */
    buildStartContainer: RoomTask<'buildStartContainer'> & {
        /**
         * 修建哪个 source 的 container
         * 会自己去找这个 source 周边的 container 工地去修
         */
        sourceId: Id<Source>
        /**
         * 要修建的 container，执行任务时由 creep 自己储存
         */
        containerId?: Id<StructureContainer>
    }
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