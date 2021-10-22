import { SquadTypeName } from "../squadManager/types";
import { runBoosting } from "./stateBoosting";
import { runSpawning } from "./stateSpawning";
import { runWaitBoostPrepare } from "./stateWaitBoostPrepare";
import { runWaitSpawnEnergyPrepare } from "./stateWaitSpawnEnergyPrepare";
import { MobilizeState, MobilizeStateName, MobilizeTask, RunMobilizeStateFunc } from "./types";

/**
 * 动员任务中不同阶段到逻辑的映射
 */
const runState: { [state in MobilizeState]: RunMobilizeStateFunc } = {
    [MobilizeState.WaitBoostPrepare]: runWaitBoostPrepare,
    [MobilizeState.WaitSpawnEnergyPrepare]: runWaitSpawnEnergyPrepare,
    [MobilizeState.Spawning]: runSpawning,
    [MobilizeState.Boosting]: runBoosting
}

type MobilizeContext = {
    getMemory: () => MobilizeTask,
    getSpawnRoom: () => Room,
    finishTask: () => void
}

export const createMobilizeManager = function (context: MobilizeContext) {
    const { getMemory, getSpawnRoom, finishTask } = context

    /**
     * 运行动员任务
     */
    const run = function () {
        const mobliizeTask = getMemory()
        runState[mobliizeTask.state](
            mobliizeTask,
            getSpawnRoom(),
            newState => mobliizeTask.state = newState,
            finishTask
        )
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