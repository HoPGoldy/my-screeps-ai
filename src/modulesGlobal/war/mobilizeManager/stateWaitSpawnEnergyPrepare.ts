import { getBodySpawnEnergy } from "@/utils";
import { getBodyPart } from "./getBodyPart";
import { RunMobilizeStateFunc, MobilizeState } from "./types";

export const runWaitSpawnEnergyPrepare: RunMobilizeStateFunc = function (task, room, updateState) {
    console.log('正在执行 WaitSpawnEnergyPrepare')

    const bodys = getBodyPart[task.squadType]()
    const spawnEnergyCost = getBodySpawnEnergy(bodys)

    if (room.energyCapacityAvailable < spawnEnergyCost) {
        log
    }
}
