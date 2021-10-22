import { RunMobilizeStateFunc, MobilizeState } from "./types";

export const runSpawning: RunMobilizeStateFunc = function (task, room, updateState) {
    console.log('正在执行 Spawning')
    console.log(task, room)
    updateState(MobilizeState.WaitSpawnEnergyPrepare)
}