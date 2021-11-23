declare global {
    interface RoomMemory {
        /**
         * 房间物流任务内存
         */
        transport: RoomTaskMemory<TransportTaskData, ManagerData>
    }
}

/**
 * 所有的物流任务类型
 * 没什么实际作用，只是方便使用者搜索自己的任务
 */
export enum TransportTaskType {
    ContainerEnergyTransfer = 1,
    FillExtension,
    FillTower,
    FillNuker,
    FillPowerSpawn,
    LabIn,
    LabOut,
    LabGetEnergy,
    FactoryGetResource,
    FactoryPutResource,
    ShareGetResource,
    StorageBlance,
    Terminal,
    CenterLink
}

/**
 * 物流任务工作处理上下文
 */
export interface TransportWorkContext {
    /**
     * 物流任务所处的房间
     */
    workRoom: Room
    /**
     * 当前执行任务的爬
     */
    manager: Creep
    /**
     * 该任务的数据
     */
    taskData: TransportTaskData
    /**
     * 该搬运爬的数据
     */
    managerData: ManagerData
    /**
     * 请求结束该任务
     */
    requireFinishTask: (reason: TaskFinishReason) => void
}

/**
 * 房间物流任务
 */
export interface TransportTask<T = TransportRequests> {
    /**
     * 要搬运的资源
     */
    requests: T[]
}

/**
 * 物流任务的目标资源配置
 */
interface TransportRequests {
    /**
     * 从哪里获取资源
     * 支持 id 和位置
     */
    from?: Id<StructureWithStore> | [number, number, string]
    /**
     * 资源搬运到哪里
     * 支持 id、位置、建筑常量
     */
    to?: Id<StructureWithStore | Creep | PowerCreep> | StructureConstant[] | [number, number, string]
    /**
     * 要转移的资源类型
     */
    resType: ResourceConstant
    /**
     * 要转移的数量，不填的话将会把目标填满或者把来源掏空
     */
    amount?: number
    /**
     * 当资源不足导致无法进行任务时，是否继续等待
     * @danger 置为 true 时将不会在资源不足时主动关闭任务，这会导致有搬运工一直卡在这个任务上
     * 请确保任务所需资源会尽快补足
     */
    keep?: boolean
}

export type TransportRequestData = TransportRequests & {
    /**
     * 正在处理该资源的搬运工名称
     */
    managerName?: string
    /**
     * 已经搬运完成了多少资源
     */
    arrivedAmount?: number
}

/**
 * 搬运工状态
 */
export enum ManagerState {
    /**
     * 清理身上的无用资源
     */
    ClearRemains = 1,
    /**
     * 获取要搬运的资源
     */
    GetResource,
    /**
     * 将资源搬运到目标
     */
    PutResource,
    /**
     * 临死之前处理后事
     */
    DeathClear,
}

/**
 * 物流任务完整版
 */
export type TransportTaskData = RoomTask & TransportTask<TransportRequestData>

/**
 * 搬运工数据
 */
export interface ManagerData {
    /**
     * 当前搬运状态
     */
    state: ManagerState
    /**
     * 缓存的来源 id
     */
    cacheSourceId?: Id<StructureWithStore | Resource>
    /**
     * 缓存的目标 id
     */
    cacheTargetId?: Id<StructureWithStore>
}

/**
 * 搬运任务完成原因
 */
export enum TaskFinishReason {
    /**
     * 完成搬运目标
     */
    Complete = 1,
    /**
     * 没有找到足够的资源
     */
    NotEnoughResource,
    /**
     * 没有找到资源存放目标
     */
    CantFindSource,
    /**
     * 没有找到要搬运到的目标
     */
    CantFindTarget
}

export type DestinationTarget = Creep | StructureWithStore | PowerCreep

export interface MoveTargetInfo<T = DestinationTarget> {
    /**
     * 目标
     * 如果任务指定的目标是一个位置的话，这个值会是 undefined
     */
    target?: T | undefined
    /**
     * 目标位置
     * 这个值为空说明运输任务找不到目标或者任务完成了
     */
    pos: RoomPosition
}
