declare global {
    interface RoomMemory {
        /**
         * 房间物流任务内存
         */
        transport: RoomTaskMemory<AllRoomTransportTask, ManagerData>
    }
}

/**
 * 所有的物流任务类型
 */
export enum TransportTaskType {
    Transport = 'transport',
    FillExtension = 'fillExtension',
    FillTower = 'fillTower',
    FillNuker = 'fillNuker',
    FillPowerSpawn = 'fillPowerSpawn',
    LabIn = 'labIn',
    LabOut = 'labOut',
    LabGetEnergy = 'labGetEnergy',
}

/**
 * 所有的房间物流任务
 */
export type AllRoomTransportTask = TransportTasks[TransportTaskType]

/**
 * 房间物流任务
 */
export interface TransportTask {
    /**
     * 从哪里获取资源
     * 支持 id 和位置
     */
    from: Id<StructureWithStore> | [number, number, string]
    /**
     * 资源搬运到哪里
     * 支持 id、位置、建筑常量
     */
    to: Id<StructureWithStore | Creep | PowerCreep> | StructureConstant | [number, number, string]
    /**
     * 要搬运的资源
     */
    res: TransportResource[]
}

/**
 * 物流任务的目标资源配置
 */
interface TransportResource {
    /**
     * 要转移的资源类型
     */
    resType: ResourceConstant
    /**
     * 要转移的数量，不填的话将会把目标填满或者把来源掏空
     */
    amount?: number
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
    PutResource
}

/**
 * 物流任务完整版
 */
export type TransportTaskData = RoomTask<TransportTaskType.Transport> & TransportTask & {
    res: (TransportResource & {
        /**
         * 正在处理该资源的搬运工名称
         */
        managerName?: string
        /**
         * 已经搬运完成了多少资源
         */
        arrivedAmount?: number
    })[]
}

/**
 * 搬运工数据
 */
export interface ManagerData {
    /**
     * 当前搬运状态
     */
    state: ManagerState
    /**
     * 当前携带的任务资源
     */
    carry: ResourceConstant[]
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

/**
 * 所有的物流任务
 */
export interface TransportTasks {
    /**
     * 基础搬运任务
     */
    [TransportTaskType.Transport]: RoomTask<TransportTaskType.Transport> & {
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
         * 当目标的资源数量小于该值时即代表任务完成，默认为全部搬完
         * 注意，如果是 source 旁放能量的 container 的话，creep 一直在往里放能量，默认可能会导致任务迟迟无法完结
         */
        endWith?: number
    }
    /**
     * 填充 spawn 及 extension
     */
    [TransportTaskType.FillExtension]: RoomTask<TransportTaskType.FillExtension>
    /**
     * 填充 tower
     */
    [TransportTaskType.FillTower]: RoomTask<TransportTaskType.FillTower> & {
        id: Id<StructureTower>
    }
    /**
     * 填充 nuker
     */
    [TransportTaskType.FillNuker]: RoomTask<TransportTaskType.FillNuker> & {
        id: Id<StructureNuker>
        resourceType: ResourceConstant
    }
    /**
     * 填充 powerSpawn
     */
    [TransportTaskType.FillPowerSpawn]: RoomTask<TransportTaskType.FillPowerSpawn> & {
        id: Id<StructurePowerSpawn>
        resourceType: ResourceConstant
    }
    /**
     * lab 填充底物
     */
    [TransportTaskType.LabIn]: RoomTask<TransportTaskType.LabIn> & {
        resource: {
            id: Id<StructureLab>
            type: ResourceConstant
            /**
             * 目标 lab 需要多少
             */
            amount: number
            /**
             * 正在执行本资源搬运的 creep 名字
             */
            transporterName?: string
        }[]
    }
    /**
     * lab 移出产物
     */
    [TransportTaskType.LabOut]: RoomTask<TransportTaskType.LabOut> & {
        /**
         * 需要净空的 lab id
         */
        labId: Id<StructureLab>[]
    }
    /**
     * boost 填充资源
     */
    [TransportTaskType.LabGetEnergy]: RoomTask<TransportTaskType.LabGetEnergy>
}

/**
 * 从内存 transport 字段解析出来的存储格式
 */
export type TransportData = TransportTasks[TransportTaskType][]
