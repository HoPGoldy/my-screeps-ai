import { MobilizeState, MobilizeTask, UpdateMobilizeStateFunc } from "../types";
import { runBoosting } from "./stateBoosting";
import { runSpawning } from "./stateSpawning";
import { runWaitBoostPrepare } from "./stateWaitBoostPrepare";
import { runWaitSpawnEnergyPrepare } from "./stateWaitSpawnEnergyPrepare";
import { RunMobilizeStateFunc } from "./types";

const runState: { [state in MobilizeState]: RunMobilizeStateFunc } = {
    [MobilizeState.WaitBoostPrepare]: runWaitBoostPrepare,
    [MobilizeState.WaitSpawnEnergyPrepare]: runWaitSpawnEnergyPrepare,
    [MobilizeState.Spawning]: runSpawning,
    [MobilizeState.Boosting]: runBoosting
}

export const runMobilizeTask = function (
    mobliizeTask: MobilizeTask,
    room: Room,
    updateState: UpdateMobilizeStateFunc
) {
    runState[mobliizeTask.state](mobliizeTask, room, updateState)
}
