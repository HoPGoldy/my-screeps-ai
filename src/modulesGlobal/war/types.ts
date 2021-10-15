/**
 * 动员任务
 * 孵化、boost
 */
export interface MobilizeTask {
    /**
     * 当前阶段
     */
    state: MobilizeState
    /**
     * 小队代号
     */
    squadCode: string
    /**
     * 小队类型
     */
    squadType: SquadType
    /**
     * 是否需要 boost
     */
    needBoost: boolean
}

/**
 * 小队存储
 */
interface SquadMemory {
    /**
     * 小队代号
     */
    code: string
    /**
     * 小队类型
     */
    type: SquadType
    /**
     * 小队成员名称
     */
    memberNames: string[]
}

export interface WarManager {
    run: () => void
    addSquad: (squadType: SquadType, needBoost: boolean, squadCode: string) => void
    removeSquad: (squadCode: string) => void
    addMobilize: (squadType: SquadType, needBoost: boolean, squadCode: string) => void
}

export interface WarMemory {
    code: string
    state: WarState
    spawnRoomName: string
    mobilizes: { [squadCode: string]: MobilizeTask }
    squads: { [squadCode: string]: SquadMemory }
}

export interface WarModuleMemory {
    wars: { [warCode: string]: WarMemory }
    default?: [SquadType, boolean, string]
}

export enum MobilizeState {
    /**
     * 等待强化
     */
    WaitBoostPrepare = 1,
    /**
     * 等待孵化能量填充完成
     */
    WaitSpawnEnergyPrepare,
    /**
     * 孵化中
     */
    Spawning,
    /**
     * 强化中
     */
    Boosting
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

export enum SquadType {
    /**
     * 一体机
     */
    Monomer = 1
}

export type UpdateMobilizeStateFunc = (newState: MobilizeState) => void

export interface BaseEffects {
    getRoomByName: (roomName: string) => Room | undefined
    getCreepByName: (creepName: string) => Creep | undefined
    getObjectById: <T>(id: Id<T>) => T | undefined
}