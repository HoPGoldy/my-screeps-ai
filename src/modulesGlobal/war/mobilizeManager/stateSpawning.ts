import { CreepRole } from "@/role/types/role";
import { getBodySpawnEnergy } from "@/utils";
import { getBodyPart } from "./getBodyPart";
import { RunMobilizeStateFunc } from "./types";

export const runSpawning: RunMobilizeStateFunc = function ({ task, room, updateState, abandonTask }, env) {
    console.log('正在执行 Spawning')

    const bodys = getBodyPart[task.squadType]()
    const spawnEnergyCost = getBodySpawnEnergy(bodys)

    if (room.energyCapacityAvailable < spawnEnergyCost) {
        abandonTask(`孵化所用能量大于房间最大孵化能量 ${spawnEnergyCost} > ${room.energyCapacityAvailable}`)
        return
    }

    // 搬运工不足，归还 spawn 并尝试补充孵化工
    const managers = room.transport.getUnit((task, creep) => creep.ticksToLive > 300)
    if (managers.length <= 0) {
        room.spawner.remandSpawn()
        if (room.spawner.getTaskByRole(CreepRole.Manager).length <= 0) {
            room.spawner.release.changeBaseUnit(CreepRole.Manager, 1)
        }
        return
    }

    // 先锁定了 spawn，再等孵化能量足够，不然有可能会孵化其他爬导致好久都生不出战斗爬
    if (!task.data.lendedSpawn) {
        if (!room.spawner.lendSpawn()) return
        task.data.lendedSpawn = true
    }

    /**
     * @todo 判断是否已经在孵化了，没有的话再检查能量是否足够孵化
     */
    if (room.energyAvailable >= spawnEnergyCost) {

    }
}