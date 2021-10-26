import { MobilizeState, MobilizeTask } from "./mobilizeManager/types"
import { SquadType } from "./squadManager/types"

/**
 * 小队存储
 */
export interface SquadMemory {
    /**
     * 小队代号
     */
    code: string
    /**
     * 要进攻的旗帜名
     * 和 cacheTargetFlagName 的区别就是，本属性是旗帜名前缀，而 cacheTargetFlagName 是完整的旗帜名
     */
    target: string
    /**
     * 正在进攻的旗帜名称
     */
    cacheTargetFlagName?: string
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
    data: AnyObject
}

/**
 * 房间内的游戏对象信息
 */
export type RoomInfo = {
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
} & {
    /**
     * 房间内的所有建筑
     */
    [StructureType in StructureConstant]: Structure<StructureType>[]
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
     * 正在动员的任务代号（squadCode）
     */
    mobilizing?: string
    /**
     * 所有的动员任务
     */
    mobilizes: { [squadCode: string]: MobilizeTask }
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

export interface ContextGetCostMatrix {
    getCostMatrix: (roomName: string) => CostMatrix
}

export interface ContextGetRoomInfo {
    getRoomInfo: (roomName: string) => RoomInfo
}