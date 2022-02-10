import { EnvContext } from '@/utils'
import { BoostContext } from '../lab/types'
import { UseSpawnContext } from '../spawn'
import { RoleMemory } from '../unitControl'

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
    nukerWallsPos?: string
    /**
     * 防御单位的内存
     */
    defender?: RoleMemory<DefenderMemory>
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
     * 防御单位角色名
     * 默认为 defender
     */
     defenderRole?: string
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
     * 添加建造任务
     * 没有任务的时候添加，有的时候啥都不干
     */
    updateBuildingTask: (room: Room) => unknown
    /**
     * 回调 - 当 creep 工作阶段发生变化
     * 例如 harvester 从采集能量转变为存放能量模式时
     */
    onCreepStageChange?: (creep: Creep, isWorking: boolean) => unknown
} & EnvContext & BoostContext & UseSpawnContext

export interface DefenderMemory {
    /**
     * 给自己提供支持的强化任务 id
     */
    boostTaskId: number
}

/**
 * 防御单位需要的本模块依赖
 */
export type DefenderWorkContext = (room: Room) => ({
    findEnemy: () => (Creep | PowerCreep)[]
    checkEnemyThreat: (enemys: (Creep | PowerCreep)[]) => boolean
})
