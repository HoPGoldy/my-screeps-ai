import { BoostResourceConfig, BoostState } from '@/modulesRoom/lab/types'
import { EnvContext } from '@/utils'
import { MobilizeTask } from './mobilizeManager/types'
import { SquadType } from './squadManager/types'

/**
 * **重要** 该战争模块对于外界模块的依赖
 */
export interface OutsideContext {
    /**
     * 包含对穿的进行移动
     * 将会在战斗单位在自己房间内寻不到路时使用，用于解决集中布局时的堵路问题
     */
    goTo: (creep: Creep, targetPos: RoomPosition) => void
    /**
     * 归还一个房间的 spawn
     */
    remandSpawn: (room: Room) => void
    /**
     * 锁定一个房间的 spawn
     * 调用该方法后该房间的 spawn 不应执行任何其他操作
     * 若无法锁定可以返回 false
     */
    lendSpawn: (room: Room) => boolean
    /**
     * 获取一个房间的运营单位数量
     */
    getRoomManager: (room: Room) => Creep[]
    /**
     * 添加指定数量的新运营单位
     */
    addManager: (room: Room, addNumber: number) => void
    /**
     * 获取房间内的 spawn
     * 用于接入房间快捷访问
     */
    getRoomSpawn: (room: Room) => StructureSpawn[]
    /**
     * 添加填充 spawn 能量任务
     * @danger 注意，该任务会在房间能量不足时持续调用，直到能量满额为止，请注意查重
     */
    addFillEnergyTask: (room: Room) => void
    /**
     * 获取一个房间的资源总量
     */
    getResource: (room: Room, resource: ResourceConstant) => number

    /**
     * 获取房间内的 lab
     * 用于接入房间快捷访问
     */
    getRoomLab: (room: Room) => StructureLab[]
    /**
     * 添加一个 boost 任务
     * 应返回该任务的唯一索引
     */
    addBoostTask: (room: Room, boostConfig: BoostResourceConfig[]) => number
    /**
     * 获取 boost 任务的状态
     */
    getBoostState: (room: Room, boostTaskId: number) => ERR_NOT_FOUND | BoostState
    /**
     * 让一个 creep 按照指定 boost 任务进行强化
     */
    boostCreep: (room: Room, creep: Creep, boostTaskId: number) => boolean
    /**
     * 结束 boost 任务
     */
    finishBoost: (room: Room, boostTaskId: number) => void
}

export type WarModuleContext = {
    getMemory: () => WarModuleMemory
} & EnvContext & OutsideContext

/**
 * 小队存储
 */
export interface SquadMemory {
    /**
     * 小队代号
     */
    code: string
    /**
     * 要进攻的旗帜名前缀
     */
    target: string
    /**
     * 小队类型
     */
    type: SquadType
    /**
     * 小队成员名称
     */
    memberNames: string[]
    /**
     * 小队保存的数据
     */
    data: Record<string, unknown>
}

/**
 * 房间内的游戏对象信息
 */
export interface RoomInfo {
    /**
     * 敌方 creep
     */
    hostileCreeps: Creep[]
    /**
     * 敌方 pc
     */
    hostilePowerCreeps: PowerCreep[]
    /**
     * 敌方建筑工地
     */
    hostileSite: ConstructionSite[]
    /**
     * 我方 creep
     */
    myCreeps: Creep[]
    /**
     * 我方 pc
     */
    myPowerCreeps: PowerCreep[]
    /**
     * 房间内的建筑
     */
    structures: AnyStructure[]
    [STRUCTURE_CONTROLLER]: StructureController[]
    [STRUCTURE_EXTENSION]: StructureExtension[]
    [STRUCTURE_EXTRACTOR]: StructureExtractor[]
    [STRUCTURE_FACTORY]: StructureFactory[]
    [STRUCTURE_INVADER_CORE]: StructureInvaderCore[]
    [STRUCTURE_KEEPER_LAIR]: StructureKeeperLair[]
    [STRUCTURE_LAB]: StructureLab[]
    [STRUCTURE_LINK]: StructureLink[]
    [STRUCTURE_NUKER]: StructureNuker[]
    [STRUCTURE_OBSERVER]: StructureObserver[]
    [STRUCTURE_POWER_SPAWN]: StructurePowerSpawn[]
    [STRUCTURE_POWER_BANK]: StructurePowerBank[]
    [STRUCTURE_RAMPART]: StructureRampart[]
    [STRUCTURE_SPAWN]: StructureSpawn[]
    [STRUCTURE_STORAGE]: StructureStorage[]
    [STRUCTURE_TERMINAL]: StructureTerminal[]
    [STRUCTURE_TOWER]: StructureTower[]
    [STRUCTURE_CONTAINER]: StructureContainer[]
    [STRUCTURE_PORTAL]: StructurePortal[]
    [STRUCTURE_ROAD]: StructureRoad[]
    [STRUCTURE_WALL]: StructureWall[]
}

/**
 * 战争内存
 */
export interface WarMemory {
    /**
     * 战争代号
     * 应当存在一个以此代号为名称的旗帜
     */
    code: string
    /**
     * 战争状态
     */
    state: WarState
    /**
     * 本战争下被击溃小队剩余的单位名称
     */
    alonedCreep: string[]
    /**
     * 本战争的孵化房间
     * @todo 后面可以升级成多个房间
     */
    spawnRoomName: string
    /**
     * 所有的动员任务
     */
    mobilizes: MobilizeTask[]
    /**
     * 下属的小队
     */
    squads: { [squadCode: string]: SquadMemory }
}

export interface WarModuleMemory {
    wars: { [warCode: string]: WarMemory }
    default?: [SquadType, boolean, string]
}

/**
 * 战争状态
 */
export enum WarState {
    /**
     * 战争进行中
     */
    Progress = 1,
    /**
     * 战争胜利
     */
    Success,
    /**
     * 战争终止
     */
    Aborted,
    /**
     * 战争结束
     */
    Finish
}
