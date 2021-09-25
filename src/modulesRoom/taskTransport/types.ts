declare global {
    interface RoomMemory {
        /**
         * 房间物流任务内存
         */
        transport: RoomTaskMemory<AllRoomTransportTask>
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
            amount: number
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
