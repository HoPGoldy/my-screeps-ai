/**
 * 物流任务数据
 */
interface TransportTask {
    /**
     * 搬多少
     * 如果该值为空的话每次搬运工都将拿取自己能携带的最大值
     */
    amount?: number
    resource: ResourceConstant
    target: TransportTarget<'id', Id<Structure>> | TransportTarget<'constant', StructureConstant>
}

interface TransportTarget<Type extends string, Data> {
    data: Data
    type: Type
}

/**
 * 所有的物流任务类型
 */
type AllTransportTaskType = keyof TransportTasks

/**
 * 所有的房间物流任务
 */
type RoomTransportTasks = TransportTasks[AllTransportTaskType]

/**
 * 所有的物流任务
 */
interface TransportTasks {
    /**
     * 填充 spawn 及 extension
     */
    fillExtension: TransportTaskBase<'fillExtension'>
    /**
     * 填充 tower
     */
    fillTower: TransportTaskBase<'fillTower'> & {
        id: Id<StructureTower>
    }
    /**
     * 填充 nuker
     */
    fillNuker: TransportTaskBase<'fillNuker'> & {
        id: Id<StructureNuker>
        resourceType: ResourceConstant
    }
    /**
     * 填充 powerSpawn
     */
    fillPowerSpawn: TransportTaskBase<'fillPowerSpawn'> & {
        id: Id<StructurePowerSpawn>
        resourceType: ResourceConstant
    }
    /**
     * lab 填充底物
     */
    labIn: TransportTaskBase<'labIn'> & {
        resource: {
            id: Id<StructureLab>
            type: ResourceConstant
            amount: number
        }[]
    }
    /**
     * lab 移出产物
     */
    labOut: TransportTaskBase<'labOut'>
    /**
     * boost 填充资源
     */
    boostGetResource: TransportTaskBase<'boostGetResource'>
    /**
     * boost 填充能量
     */
    boostGetEnergy: TransportTaskBase<'boostGetEnergy'>
    /**
     * boost 清理资源
     */
    boostClear: TransportTaskBase<'boostClear'>
}

/**
 * 物流任务基础信息
 */
interface TransportTaskBase<T extends string> {
    /**
     * 该物流任务的类型
     */
    type: T,
    /**
     * 该物流任务的优先级
     * 若为空则按照发布顺序进行排序
     */
    priority?: number
    /**
     * 该任务需要多少搬运工执行
     * 若为空则不会为该任务新增 creep
     */
    need?: number
    /**
     * 正在执行该任务的搬运工 id
     */
    executor: Id<Creep>[]
}

/**
 * 从内存 transport 字段解析出来的存储格式
 */
type TransportData = { [taskType in AllTransportTaskType]?: TransportTasks[taskType] }

interface transferTaskOperation {
    /**
     * creep 工作时执行的方法
     */
    target: (creep: Creep, task: RoomTransportTasks) => boolean
    /**
     * creep 非工作(收集资源时)执行的方法
     */
    source: (creep: Creep, task: RoomTransportTasks, sourceId: Id<StructureWithStore>) => boolean
}

interface RoomTransportType {
    addTask(task: RoomTransportTasks): boolean 

    /**
     * 获取应该执行的任务
     */
    getTask(creep: Creep) 

    /**
     * 是否存在某个任务
     */
    hasTask(taskType: AllTransportTaskType)

    /**
     * 移除一个任务
     */
    removeTask(taskType: AllTransportTaskType): OK | ERR_NOT_FOUND
}