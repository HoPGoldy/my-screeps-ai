import { EnvContext, EnvMethods } from "@/contextTypes";
import { SquadType } from "../squadManager/types";

export type UpdateMobilizeStateFunc = (newState: MobilizeState) => void

type FinishTaskFunc = (creeps: Creep[]) => void

type AbandonTaskFunc = (reason: string) => void

export type MobilizeContext = {
    getMemory: () => MobilizeTask,
    getSpawnRoom: () => Room,
    finishTask: FinishTaskFunc
    abandonTask: AbandonTaskFunc
} & EnvContext

interface RunMobilizeStateContext {
    task: MobilizeTask,
    room: Room,
    updateState: UpdateMobilizeStateFunc,
    finishTask: FinishTaskFunc,
    abandonTask: AbandonTaskFunc
}

export type RunMobilizeStateFunc = (context: RunMobilizeStateContext, env: EnvMethods) => void

export enum MobilizeState {
    /**
     * 等待强化
     */
    WaitBoostPrepare = 1,
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
     * 小队进攻旗帜名
     */
    suqadTarget: string
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
    /**
     * 该任务对应的 boost 任务 id
     */
    boostTaskId?: number
    /**
     * 该任务是否已经借到了 spawn
     */
    lendedSpawn?: boolean
    /**
     * 孵化信息
     */
    spawnInfo?: {
        [creepName: string]: BodyPartConstant[]
    }
    /**
     * 该小队已经孵化出来，但是还未准备就绪的爬名字
     */
    members?: string[]
    /**
     * 小队成员是否完成了 boost
     * 对应的 value 为 true 代表完成了 boost
     */
    boostNote?: {
        [creepName: string]: boolean
    }
}

export const MobilizeStateName: { [state in MobilizeState]: string } = {
    [MobilizeState.WaitBoostPrepare]: '等待强化材料准备就绪',
    [MobilizeState.Spawning]: '孵化中',
    [MobilizeState.Boosting]: '强化中'
}