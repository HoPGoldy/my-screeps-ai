/**
 * 所有的物流任务类型
 */
type AllTransportTaskType = keyof TransportTasks

/**
 * 所有的房间物流任务
 */
type AllRoomTransportTask = TransportTasks[AllTransportTaskType]

/**
 * 所有的物流任务
 */
interface TransportTasks {
    /**
     * 基础搬运任务
     */
    transport: RoomTask<'transport'> & {
        /**
         * 从哪里搬运，数字元组代表一个位置
         */
        from: [number, number, string] | Id<StructureWithStore>
        /**
         * 搬运到哪里
         */
        to: [number, number, string] | Id<StructureWithStore>
        /**
         * 搬运啥
         */
        resourceType: ResourceConstant
        /**
         * 怎么算完成任务：clear 代表目标位置不存在该资源就完成任务
         * 该字段为空的话该任务将永远不会结束，需要外部模块手动取消（或者 from 指定的建筑不存在了也会结束）
         */
        endWith?: 'clear'
    }
    /**
     * 填充 spawn 及 extension
     */
    fillExtension: RoomTask<'fillExtension'>
    /**
     * 填充 tower
     */
    fillTower: RoomTask<'fillTower'> & {
        id: Id<StructureTower>
    }
    /**
     * 填充 nuker
     */
    fillNuker: RoomTask<'fillNuker'> & {
        id: Id<StructureNuker>
        resourceType: ResourceConstant
    }
    /**
     * 填充 powerSpawn
     */
    fillPowerSpawn: RoomTask<'fillPowerSpawn'> & {
        id: Id<StructurePowerSpawn>
        resourceType: ResourceConstant
    }
    /**
     * lab 填充底物
     */
    labIn: RoomTask<'labIn'> & {
        resource: {
            id: Id<StructureLab>
            type: ResourceConstant
        }[]
    }
    /**
     * lab 移出产物
     */
    labOut: RoomTask<'labOut'>
    /**
     * boost 填充资源
     */
    boostGetResource: RoomTask<'boostGetResource'>
    /**
     * boost 填充能量
     */
    boostGetEnergy: RoomTask<'boostGetEnergy'>
    /**
     * boost 清理资源
     */
    boostClear: RoomTask<'boostClear'>
}

/**
 * 从内存 transport 字段解析出来的存储格式
 */
type TransportData = TransportTasks[AllTransportTaskType][]

interface RoomTransportType {
    /**
     * 填写一个新的房间物流任务
     * 
     * @param task 要添加的物流任务
     * @returns taskKey 该任务的唯一索引
     */
    addTask(task: AllRoomTransportTask): number 
    /**
     * 获取应该执行的任务
     */
    getWork(creep: Creep): RoomTaskAction
    /**
     * 是否存在某个任务
     */
    hasTask(taskType: AllTransportTaskType)
    /**
     * 移除一个任务
     */
    removeTask(taskKey: number | AllTransportTaskType): OK | ERR_NOT_FOUND
    /**
     * 获取该房间的搬运工调整期望
     */
    getExpect(): number
    /**
     * 搬运工工作时长 + 1
     */
    countWorkTime(): void
}

/**
 * 物流搬运任务逻辑的生成函数
 */
type TransportActionGenerator<T extends AllTransportTaskType = AllTransportTaskType> = (
    creep: MyCreep<'manager'>,
    task: TransportTasks[T],
    taskKey: number,
    transportController: RoomTransportType
) => RoomTaskAction