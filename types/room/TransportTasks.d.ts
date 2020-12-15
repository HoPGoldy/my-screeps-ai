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
    fillExtension: {
        type: 'fillExtension'
    }
    /**
     * 填充 tower
     */
    fillTower: {
        type: 'fillTower'
        id: Id<StructureTower>
    }
    /**
     * 填充 nuker
     */
    fillNuker: {
        type: 'fillNuker'
        id: Id<StructureNuker>
        resourceType: ResourceConstant
    }
    /**
     * 填充 powerSpawn
     */
    fillPowerSpawn: {
        type: 'fillPowerSpawn'
        id: Id<StructurePowerSpawn>
        resourceType: ResourceConstant
    }
    /**
     * lab 填充底物
     */
    labIn: {
        type: 'labIn'
        resource: {
            id: Id<StructureLab>
            type: ResourceConstant
            amount: number
        }[]
    }
    /**
     * lab 移出产物
     */
    labOut: {
        type: 'labOut'
    }
    /**
     * boost 填充资源
     */
    boostGetResource: {
        type: 'boostGetResource'
    }
    /**
     * boost 填充能量
     */
    boostGetEnergy: {
        type: 'boostGetEnergy'
    }
    /**
     * boost 清理资源
     */
    boostClear: {
        type: 'boostClear'
    }
}

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