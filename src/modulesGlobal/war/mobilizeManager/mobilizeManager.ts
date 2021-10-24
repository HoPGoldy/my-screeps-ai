import { BaseContext } from "@/contextTypes";
import { SquadTypeName } from "../squadManager/types";
import { runBoosting } from "./stateBoosting";
import { runSpawning } from "./stateSpawning";
import { runWaitBoostPrepare } from "./stateWaitBoostPrepare";
import { runWaitSpawnEnergyPrepare } from "./stateWaitSpawnEnergyPrepare";
import { MobilizeContext, MobilizeState, MobilizeStateName, RunMobilizeStateFunc } from "./types";

/**
 * 动员任务中不同阶段到逻辑的映射
 */
const runState: { [state in MobilizeState]: RunMobilizeStateFunc } = {
    [MobilizeState.WaitBoostPrepare]: runWaitBoostPrepare,
    [MobilizeState.WaitSpawnEnergyPrepare]: runWaitSpawnEnergyPrepare,
    [MobilizeState.Spawning]: runSpawning,
    [MobilizeState.Boosting]: runBoosting
}

export const createMobilizeManager = function (context: MobilizeContext) {
    const { getMemory } = context

    /**
     * 运行动员任务
     */
    const run = function () {
        if (Game.time % 10) return

        const mobliizeTask = getMemory()
        runState[mobliizeTask.state](context)
    }

    /**
     * 显示运行状态
     */
    const showState = function () {
        const { state, squadCode, squadType } = getMemory()
        return `[${squadCode} 小队动员任务] [当前阶段] ${MobilizeStateName[state]} [小队类型] ${SquadTypeName[squadType]}`
    }

    return { run, showState }
}

export type MobilizeManager = ReturnType<typeof createMobilizeManager>