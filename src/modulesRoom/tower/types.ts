import { EnvContext } from '@/utils'
import { BoostContext } from '../lab/types'

export interface TowerMemory {
    /**
     * 当前房间的防御模式
     */
    state?: DefenseState
    /**
     * 等待建造的墙壁位置
     */
    walls?: string[]
    /**
     * 等待建造的 rampart 位置
     */
    ramparts?: string[]
    /**
     * 正在建造的 wall 或者 rampart
     */
    building?: string[]
    /**
     * 当前正在进行的强化任务 id
     */
    boostId?: number
    /**
     * 当前要优先刷的焦点墙
     */
    focusWallId?: Id<StructureRampart | StructureWall>
    /**
     * 焦点墙的刷新时间
     */
    focusTimeout?: number
    /**
     * 要放置 nuker 防御墙壁的位置
     */
    nukerWallsPos?: string[]
}

/**
 * 当前房间的防御模式
 */
export enum DefenseState {
    /**
     * 日常模式
     */
    Daily = 1,
    /**
     * 被动防御模式
     */
    Defense,
    /**
     * 主动防御模式
     */
    Active
}

export interface BuildingSite<T = STRUCTURE_WALL | STRUCTURE_RAMPART> {
    pos: RoomPosition
    type: T
}

export type TowerContext = {
    /**
     * 获取 tower 的内存对象
     */
    getMemory: (room: Room) => TowerMemory
    /**
     * 获取房间里可用的 tower
     */
    getTower: (room: Room) => StructureTower[]
    /**
     * 获取房间里可用的 wall
     */
    getWall: (room: Room) => StructureWall[]
    /**
     * 获取房间里可用的 rampart
     */
    getRampart: (room: Room) => StructureRampart[]
    /**
     * 获取房间里可用的 lab
     */
    getLab: (room: Room) => StructureLab[]
    /**
     * 当前是否存在 tower 填充任务
     */
    hasFillTowerTask: (room: Room) => boolean
    /**
     * 新增 tower 填充任务
     */
    addFillTowerTask: (room: Room) => unknown
    /**
     * 判断一个 creep 是否为友军
     */
    isFriend: (creep: Creep | PowerCreep) => boolean
    /**
     * 回调 - 当房间中的敌人消失（撤走 / 被击杀）时调用
     */
    onBackToNormal?: (room: Room) => unknown
    /**
     * 回调 - 当房间进入主动防御模式时调用
     */
    onStartActiveDefense?: (room: Room) => unknown
    /**
     * 发布防御单位
     */
    releaseDefender: (room: Room, boostTaskId: number) => unknown
    /**
     * 获取防御单位
     */
    getDefender: (room: Room) => Creep
    /**
     * 添加建造任务
     * 没有任务的时候添加，有的时候啥都不干
     */
    updateBuildingTask: (room: Room) => unknown
} & EnvContext & BoostContext
