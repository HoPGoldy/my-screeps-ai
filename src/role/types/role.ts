/**
 * creep 的角色枚举
 */
export enum CreepRole {
    Harvester = 'harvester',
    Worker = 'worker',
    Manager = 'manager',
    Claimer = 'claimer',
    Reserver = 'reserver',
    Signer = 'signer',
    PbHealer = 'pbHealer',
    RemoteBuilder = 'remoteBuilder',
    RemoteUpgrader = 'remoteUpgrader',
    RemoteHarvester = 'remoteHarvester',
    MoveTester = 'moveTester',
    Reiver = 'reiver',
    Defender = 'defender',
}

// /**
//  * 指定了具体角色的 creep 内存
//  */
// export interface RoleCreepMemory<Role extends CreepRole = CreepRole> extends CreepMemory {
//     data: RoleDatas[Role]
// }

// /**
//  * 指定了具体角色的 creep
//  */
// export class RoleCreep<Role extends CreepRole = CreepRole> extends Creep {
//     memory: RoleCreepMemory<Role>
// }

// /**
//  * 所有的 creep data
//  */
// export type CreepData = RoleDatas[CreepRole]

// /**
//  * creep 角色到数据的映射
//  */
// export interface RoleDatas {
//     /**
//      * 房间运营
//      */
//     [CreepRole.Worker]: WorkerData
//     [CreepRole.Manager]: transporterData

//     /**
//      * 外派单位
//      */
//     [CreepRole.Claimer]: RemoteDeclarerData
//     [CreepRole.Reserver]: RemoteDeclarerData
//     [CreepRole.Signer]: RemoteDeclarerData
//     [CreepRole.RemoteBuilder]: RemoteHelperData
//     [CreepRole.RemoteUpgrader]: RemoteHelperData
//     [CreepRole.RemoteHarvester]: RemoteEnergyHarvesterData
//     [CreepRole.MoveTester]: RemoteResourceHarvesterData
//     [CreepRole.Reiver]: ReiverData

//     /**
//      * 战斗单位
//      */
//     [CreepRole.Defender]: DefenderData
// }

// interface DefenderData {
//     /**
//      * 防御单位要执行的强化
//      */
//     boostTaskId?: number
// }

// /**
//  * Creep 角色功能逻辑
//  */
// export interface CreepConfig<Role extends CreepRole> {
//     /**
//      * 该 creep 是否需要
//      *
//      * 每次死后都会进行判断，只有返回 true 时才会重新发布孵化任务
//      * 该方法为空则默认持续孵化
//      */
//     isNeed?: (room: Room, preMemory: RoleCreepMemory<Role>, creepName: string) => boolean
//     /**
//      * 准备阶段
//      *
//      * creep 出生后会执行该方法来完成一些需要准备的工作，返回 true 时代表准备完成
//      * 该方法为空则直接进入 source 阶段
//      */
//     prepare?: (creep: RoleCreep<Role>) => boolean
//     /**
//      * 获取工作资源阶段
//      *
//      * 返回 true 则执行 target 阶段，返回其他将继续执行该方法
//      * 该方法为空则一直重复执行 target 阶段
//      */
//     source?: (creep: RoleCreep<Role>) => boolean
//     /**
//      * 工作阶段
//      *
//      * 返回 true 则执行 source 阶段，返回其他将继续执行该方法
//      * 该方法不可未空
//      */
//     target: (creep: RoleCreep<Role>) => boolean
//     /**
//      * 每个角色默认的身体组成部分
//      */
//     bodys: (room: Room, spawn: StructureSpawn, data: RoleDatas[Role]) => BodyPartConstant[]
// }

// /**
//  * 能量采集单位 data
//  */
// interface HarvesterData {
//     /**
//      * 要采集的 Source 索引
//      */
//     sourceId: Id<Source>
//     /**
//      * 该 creep 的工作房间
//      * 能量采集单位会先抵达该房间然后开始采集
//      */
//     harvestRoom: string
//     /**
//      * 能量要存储/应用到的房间
//      */
//     useRoom: string
// }

// /**
//  * 工作单位的 data
//  */
// interface WorkerData {
//     /**
//      * 该 creep 的工作房间
//      * 例如一个外矿搬运者需要知道自己的老家在哪里
//      */
//     workRoom: string
// }

// /**
//  * 运输单位的 data
//  */
// interface transporterData {
//     /**
//      * 要使用的资源存放建筑 id
//      */
//     sourceId?: Id<AnyStoreStructure>
//     /**
//      * 该 creep 的工作房间
//      * 例如一个外矿搬运者需要知道自己的老家在哪里
//      */
//     workRoom: string
// }

// /**
//  * 远程协助单位的 data
//  */
// interface RemoteHelperData {
//     /**
//      * 要支援的房间名
//      */
//     targetRoomName: string
//     /**
//      * 该房间中的能量来源
//      */
//     sourceId: Id<Source | StructureContainer | StructureStorage | StructureTerminal>
// }

// /**
//  * 掠夺者单位的 data
//  */
// interface ReiverData {
//     /**
//      * 目标建筑上的旗帜名称
//      */
//     flagName: string
//     /**
//      * 要搬运到的建筑 id
//      */
//     targetId: Id<AnyStoreStructure>
// }

// /**
//  * 远程声明单位的 data
//  * 这些单位都会和目标房间的 controller 打交道
//  */
// interface RemoteDeclarerData {
//     /**
//      * 要声明控制的房间名
//      */
//     targetRoomName: string
//     /**
//      * 给控制器的签名
//      */
//     signText?: string
// }

// /**
//  * 外矿采集单位的 data
//  */
//  interface RemoteEnergyHarvesterData {
//     /**
//      * 外矿所在房间名
//      */
//     roomName: string
//     /**
//      * 要采集的source名称
//      */
//     sourceId: Id<Source>
// }

// /**
//  * 公路房资源采集单位的 data
//  */
// interface RemoteResourceHarvesterData {
//     /**
//      * 要采集的资源旗帜名称
//      */
//     sourceFlagName: string
//     /**
//      * 资源要存放到哪个建筑里，外矿采集者必须指定该参数
//      */
//     targetId?: Id<AnyStoreStructure>
// }
