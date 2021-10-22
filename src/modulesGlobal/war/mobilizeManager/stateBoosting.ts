import { RunMobilizeStateFunc, MobilizeState } from "./types";

export const runBoosting: RunMobilizeStateFunc = function (task, room, updateState) {
    console.log('正在执行 Boosting')
    console.log(task, room)
    updateState(MobilizeState.WaitSpawnEnergyPrepare)
}