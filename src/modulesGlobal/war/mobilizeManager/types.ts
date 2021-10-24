import { BaseContext } from "@/contextTypes";
import { SquadType } from "../squadManager/types";

export type UpdateMobilizeStateFunc = (newState: MobilizeState) => void

export type MobilizeContext = {
    getMemory: () => MobilizeTask,
    getSpawnRoom: () => Room,
    finishTask: () => void
} & BaseContext

export type RunMobilizeStateFunc = (context: MobilizeContext) => void

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
    /**
     * 该任务存放的临时数据
     */
    data: MobilizeTaskData
}

/**
 * 动员任务数据
 */
interface MobilizeTaskData {
    boostTaskId?: number
}

export const MobilizeStateName: { [state in MobilizeState]: string } = {
    [MobilizeState.WaitBoostPrepare]: '等待强化材料准备就绪',
    [MobilizeState.WaitSpawnEnergyPrepare]: '等待孵化能量就绪',
    [MobilizeState.Spawning]: '孵化中',
    [MobilizeState.Boosting]: '强化中'
}