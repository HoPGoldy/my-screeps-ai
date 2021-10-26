import { SquadTypeName } from "../squadManager/types";
import { runBoosting } from "./stateBoosting";
import { runSpawning } from "./stateSpawning";
import { runWaitBoostPrepare } from "./stateWaitBoostPrepare";
import { MobilizeContext, MobilizeState, MobilizeStateName, RunMobilizeStateFunc } from "./types";

/**
 * 动员任务中不同阶段到逻辑的映射
 */
const runState: { [state in MobilizeState]: RunMobilizeStateFunc } = {
    [MobilizeState.WaitBoostPrepare]: runWaitBoostPrepare,
    [MobilizeState.Spawning]: runSpawning,
    [MobilizeState.Boosting]: runBoosting
}

export const createMobilizeManager = function (context: MobilizeContext) {
    const { getMemory, getSpawnRoom, finishTask, abandonTask, env } = context

    /**
     * 运行动员任务
     */
    const run = function () {
        const task = getMemory()
        // boost 阶段每 tick 都要执行，其他阶段每 10 tick 执行一次
        if (task.state !== MobilizeState.Boosting && Game.time % 10) return
        const room = getSpawnRoom()

        runState[task.state]({ 
            task,
            room,
            updateState: newState => task.state = newState,
            finishTask,
            abandonTask
        }, env)
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