import { MobilizeState } from "../types";
import { RunMobilizeStateFunc } from "./types";

export const runWaitBoostPrepare: RunMobilizeStateFunc = function (task, room, updateState) {
    console.log('正在执行 waitBoostPrepare')
    console.log(task, room)
    updateState(MobilizeState.WaitSpawnEnergyPrepare)
}