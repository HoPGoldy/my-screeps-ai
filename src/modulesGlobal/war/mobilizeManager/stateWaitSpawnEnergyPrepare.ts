import { MobilizeState } from "../types";
import { RunMobilizeStateFunc } from "./types";

export const runWaitSpawnEnergyPrepare: RunMobilizeStateFunc = function (task, room, updateState) {
    console.log('正在执行 WaitSpawnEnergyPrepare')
    console.log(task, room)
    updateState(MobilizeState.WaitSpawnEnergyPrepare)
}