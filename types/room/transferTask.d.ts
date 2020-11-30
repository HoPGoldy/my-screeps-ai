/**
 * 所有房间物流任务
 */
type RoomTransferTasks = IFillTower | IFillExtension | IFillNuker | ILabIn | ILabOut | IBoostGetResource | IBoostGetEnergy | IBoostClear | IFillPowerSpawn

/**
 * 房间物流任务 - 填充拓展
 */
interface IFillExtension {
    type: string
}

/**
 * 房间物流任务 - 填充塔
 */
interface IFillTower {
    type: string
    id: Id<StructureTower>
}

/**
 * 房间物流任务 - 填充核弹
 */
interface IFillNuker {
    type: string
    id: Id<StructureNuker>
    resourceType: ResourceConstant
}

/**
 * 房间物流任务 - 填充 PowerSpawn
 */
interface IFillPowerSpawn {
    type: string
    id: Id<StructurePowerSpawn>
    resourceType: ResourceConstant
}

/**
 * 房间物流任务 - lab 底物填充
 */
interface ILabIn {
    type: string
    resource: {
        id: Id<StructureLab>
        type: ResourceConstant
        amount: number
    }[]
}

/**
 * 房间物流任务 - lab 产物移出
 */
interface ILabOut {
    type: string
}

/**
 * 房间物流任务 - boost 资源填充
 */
interface IBoostGetResource {
    type: string
}

/**
 * 房间物流任务 - boost 能量填充
 */
interface IBoostGetEnergy {
    type: string
}

/**
 * 房间物流任务 - boost 资源清理
 */
interface IBoostClear {
    type: string
}

interface transferTaskOperation {
    /**
     * creep 工作时执行的方法
     */
    target: (creep: Creep, task: RoomTransferTasks) => boolean
    /**
     * creep 非工作(收集资源时)执行的方法
     */
    source: (creep: Creep, task: RoomTransferTasks, sourceId: Id<StructureWithStore>) => boolean
}