declare global {
    interface RoomMemory {
        /**
         * 房间工作任务内存
         */
        work: RoomTaskMemory<AllRoomWorkTask>
    }
}

/**
 * 所有的物流任务类型
 */
export enum WorkTaskType {
    Upgrade = 'upgrade',
    Build = 'build',
    BuildStartContainer = 'buildStartContainer',
    Repair = 'repair',
    FillWall = 'fillWall',
}

/**
 * 所有的房间物流任务
 */
export type AllRoomWorkTask = WorkTasks[WorkTaskType]

/**
 * 所有的物流任务
 */
export interface WorkTasks {
    /**
     * 升级任务
     */
    [WorkTaskType.Upgrade]: RoomTask<WorkTaskType.Upgrade>
    /**
     * 建造任务
     */
    [WorkTaskType.Build]: RoomTask<WorkTaskType.Build> & {
        targetId?: Id<ConstructionSite>
    }
    /**
     * 初始 source container 建造任务
     */
    [WorkTaskType.BuildStartContainer]: RoomTask<WorkTaskType.BuildStartContainer> & {
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
    [WorkTaskType.Repair]: RoomTask<WorkTaskType.Repair>
    /**
     * 刷墙任务
     */
    [WorkTaskType.FillWall]: RoomTask<WorkTaskType.FillWall>
}

/**
 * 从内存 workList 字段解析出来的存储格式
 */
export type WorkTaskData = WorkTasks[WorkTaskType][]

/**
 * 特殊身体类型
 */
export type SepicalBodyType = 'upgrade7' | 'upgrade8'