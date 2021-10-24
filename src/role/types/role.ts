import { SepicalBodyType } from "@/modulesRoom/taskWork/types"

/**
 * powerbank 的采集阶段
 */
export enum PbHarvestState {
    /**
     * 正在拆除
     */
    Attack = 1,
    /**
     * 快拆完了，carrier 准备过来
     */
    Prepare,
    /**
     * 拆除完成，正在搬运
     */
    Transfer
}

/**
 * creep 的角色枚举
 */
export enum CreepRole {
    Harvester = 'harvester',
    Worker = 'worker',
    Manager = 'manager',
    Processor = 'processor',
    Miner = 'miner',
    Claimer = 'claimer',
    Reserver = 'reserver',
    Signer = 'signer',
    RemoteBuilder = 'remoteBuilder',
    RemoteUpgrader = 'remoteUpgrader',
    RemoteHarvester = 'remoteHarvester',
    DepositHarvester = 'depositHarvester',
    PbAttacker = 'pbAttacker',
    PbHealer = 'pbHealer',
    PbCarrier = 'pbCarrier',
    MoveTester = 'moveTester',
    Reiver = 'reiver',
    Soldier = 'soldier',
    Doctor = 'doctor',
    BoostDoctor = 'boostDoctor',
    Dismantler = 'dismantler',
    BoostDismantler = 'boostDismantler',
    Apocalypse = 'apocalypse',
    Defender = 'defender',
}

/**
 * 指定了具体角色的 creep 内存
 */
export interface RoleCreepMemory<Role extends CreepRole = CreepRole> extends CreepMemory {
    data: RoleDatas[Role]
}

/**
 * 指定了具体角色的 creep
 */
export class RoleCreep<Role extends CreepRole = CreepRole> extends Creep {
    memory: RoleCreepMemory<Role>
}

/**
 * 所有的 creep data
 */
export type CreepData = RoleDatas[CreepRole]

/**
 * creep 角色到数据的映射
 */
export interface RoleDatas {
    /**
     * 房间运营
     */
    [CreepRole.Harvester]: HarvesterData & {
        /**
         * 将采集到的能量运到哪个建筑
         * 如果指定了这个字段的话，harvester 将不会动态切换采集模式，直到对应的建筑无法访问
         */
        targetId?: Id<StructureWithStore>
    }
    [CreepRole.Worker]: WorkerData
    [CreepRole.Manager]: transporterData
    [CreepRole.Processor]: ProcessorData
    [CreepRole.Miner]: WorkerData

    /**
     * 外派单位
     */
    [CreepRole.Claimer]: RemoteDeclarerData
    [CreepRole.Reserver]: RemoteDeclarerData
    [CreepRole.Signer]: RemoteDeclarerData
    [CreepRole.RemoteBuilder]: RemoteHelperData
    [CreepRole.RemoteUpgrader]: RemoteHelperData
    [CreepRole.RemoteHarvester]: RemoteEnergyHarvesterData
    [CreepRole.DepositHarvester]: RemoteResourceHarvesterData
    [CreepRole.PbAttacker]: pbAttackerData
    [CreepRole.PbHealer]: HealUnitData
    [CreepRole.PbCarrier]: RemoteResourceHarvesterData
    [CreepRole.MoveTester]: RemoteResourceHarvesterData
    [CreepRole.Reiver]: ReiverData

    /**
     * 战斗单位
     */
    [CreepRole.Soldier]: WarUnitData
    [CreepRole.Doctor]: HealUnitData
    [CreepRole.BoostDoctor]: HealUnitData
    [CreepRole.Dismantler]: WarUnitData
    [CreepRole.BoostDismantler]: WarUnitData
    [CreepRole.Apocalypse]: ApocalypseData
    [CreepRole.Defender]: DefenderData
}

interface DefenderData {
    /**
     * 防御单位要执行的强化
     */
    boostTaskId?: number
}

/**
 * Creep 角色功能逻辑
 */
export interface CreepConfig<Role extends CreepRole> {
    /**
     * 该 creep 是否需要
     * 
     * 每次死后都会进行判断，只有返回 true 时才会重新发布孵化任务
     * 该方法为空则默认持续孵化
     */
    isNeed?: (room: Room, preMemory: RoleCreepMemory<Role>, creepName: string) => boolean
    /**
     * 准备阶段
     * 
     * creep 出生后会执行该方法来完成一些需要准备的工作，返回 true 时代表准备完成
     * 该方法为空则直接进入 source 阶段
     */
    prepare?: (creep: RoleCreep<Role>) => boolean
    /**
     * 获取工作资源阶段
     * 
     * 返回 true 则执行 target 阶段，返回其他将继续执行该方法
     * 该方法为空则一直重复执行 target 阶段
     */
    source?: (creep: RoleCreep<Role>) => boolean
    /**
     * 工作阶段
     * 
     * 返回 true 则执行 source 阶段，返回其他将继续执行该方法
     * 该方法不可未空
     */
    target: (creep: RoleCreep<Role>) => boolean
    /**
     * 每个角色默认的身体组成部分
     */
    bodys: (room: Room, spawn: StructureSpawn, data: RoleDatas[Role]) => BodyPartConstant[]
}

/**
 * 有些角色不需要 data
 */
interface EmptyData { }

/**
 * 能量采集单位 data
 */
interface HarvesterData {
    /**
     * 要采集的 Source 索引
     */
    sourceId: Id<Source>
    /**
     * 该 creep 的工作房间
     * 能量采集单位会先抵达该房间然后开始采集
     */
    harvestRoom: string
    /**
     * 能量要存储/应用到的房间
     */
    useRoom: string
    /**
     * 要站立到的采集能量的位置
     * 在采集单位第一次到达 source 旁确定
     */
    standPos?: string
}

/**
 * 工作单位的 data
 */
interface WorkerData {
    /**
     * 该工作单位的特殊身体部件，例如一个 20WORK 1CARRY 5MOVE 的黄球就是工作单位的一种特殊体型
     * 该字段为空代表是标准的角色体型
     */
    bodyType?: SepicalBodyType
    /**
     * 该 creep 的工作房间
     * 例如一个外矿搬运者需要知道自己的老家在哪里
     */
    workRoom: string
}

/**
 * 运输单位的 data
 */
interface transporterData {
    /**
     * 要使用的资源存放建筑 id
     */
    sourceId?: Id<StructureWithStore>
    /**
     * 该工作单位的特殊身体部件，同 WorkData.bodyType
     */
    bodyType?: SepicalBodyType
    /**
     * 该 creep 的工作房间
     * 例如一个外矿搬运者需要知道自己的老家在哪里
     */
    workRoom: string
}

/**
 * 中央运输者的 data 
 * x y 为其在房间中的固定位置
 */
interface ProcessorData {
    x: number
    y: number
}

/**
 * 远程协助单位的 data
 */
interface RemoteHelperData {
    /**
     * 要支援的房间名
     */
    targetRoomName: string
    /**
     * 该房间中的能量来源
     */
    sourceId: Id<Source | StructureContainer | StructureStorage | StructureTerminal>
}

/**
 * 掠夺者单位的 data
 */
interface ReiverData {
    /**
     * 目标建筑上的旗帜名称
     */
    flagName: string
    /**
     * 要搬运到的建筑 id
     */
    targetId: Id<StructureWithStore>
}

/**
 * 远程声明单位的 data
 * 这些单位都会和目标房间的 controller 打交道
 */
interface RemoteDeclarerData {
    /**
     * 要声明控制的房间名
     */
    targetRoomName: string
    /**
     * 给控制器的签名
     */
    signText?: string
}

/**
 * 外矿采集单位的 data
 */
 interface RemoteEnergyHarvesterData {
    /**
     * 外矿所在房间名
     */
    roomName: string
    /**
     * 要采集的source名称
     */
    sourceId: Id<Source>
}

/**
 * 公路房资源采集单位的 data
 */
interface RemoteResourceHarvesterData {
    /**
     * 要采集的资源旗帜名称
     */
    sourceFlagName: string
    /**
     * 资源要存放到哪个建筑里，外矿采集者必须指定该参数
     */
    targetId?: Id<StructureWithStore>
}

interface pbAttackerData {
    /**
     * 要采集的资源旗帜名称
     */
    sourceFlagName: string
    /**
     * 资源要存放到哪个建筑里，外矿采集者必须指定该参数
     */
    healerCreepName: string
}

/**
 * 战斗单位的 data
 */
interface WarUnitData {
    /**
     * 要攻击的旗帜名
     */
    targetFlagName: string
    /**
     * 其治疗者名称，战斗单位会尽量保持该单位和自己相邻
     */
    healerName?: string
    /**
     * 是否持续孵化
     */
    keepSpawn: boolean
}

/**
 * 一体机战斗单位的 data
 */
interface ApocalypseData {
    /**
     * 要攻击的旗帜名
     */
    targetFlagName: string
    /**
     * 抗几个塔的伤害，由这个参数决定其身体部件组成
     */
    bearTowerNum: 0 | 1 | 2 | 3 | 4 | 5 | 6
    /**
     * 是否持续孵化
     */
    keepSpawn: boolean
}

/**
 * 治疗单位的 data
 */
interface HealUnitData {
    /**
     * 要治疗的旗帜名
     */
    creepName: string
    /**
     * 是否持续孵化
     */
    keepSpawn?: boolean
}
