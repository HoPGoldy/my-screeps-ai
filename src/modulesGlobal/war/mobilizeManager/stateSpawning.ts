import { TransportTaskType } from "@/modulesRoom/taskTransport/types";
import { CreepRole } from "@/role/types/role";
import { getBodySpawnEnergy } from "@/utils";
import { createSpawnInfo } from "./getBodyPart";
import { MobilizeState, RunMobilizeStateFunc } from "./types";

/**
 * 动员任务孵化阶段
 * 
 * @todo 孵化四人小队的生命对齐功能
 */
export const runSpawning: RunMobilizeStateFunc = function ({ task, room, updateState, abandonTask }, env) {
    // console.log('正在执行 Spawning')

    // 创建待孵化 creep 的名字与身体部件
    if (!task.data.spawnInfo) {
        task.data.spawnInfo = createSpawnInfo(room, task.squadCode, task.squadType)
    }

    const allBody: BodyPartConstant[] = [].concat(...Object.values(task.data.spawnInfo))
    const spawnEnergyCost = getBodySpawnEnergy(allBody)

    if (room.energyCapacityAvailable < spawnEnergyCost) {
        abandonTask(`孵化所用能量大于房间最大孵化能量 ${spawnEnergyCost} > ${room.energyCapacityAvailable}`)
        return
    }

    if (room.energyAvailable <= room.energyCapacityAvailable) {
        room.transport.updateTask({ type: TransportTaskType.FillExtension, priority: 10 }, { dispath: true })
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

    // 找到所有没孵化的成员
    const unSpawnMembers = Object.entries(task.data.spawnInfo).filter(([creepName]) => !env.getCreepByName(creepName))

    // 所有的单位都已经进入孵化或孵化完成，进入下一阶段
    if (unSpawnMembers.length <= 0) {
        // 更新一下内存，spawnInfo 挺长的，后面阶段用不到了，清掉
        task.data.members = Object.keys(task.data.spawnInfo)
        delete task.data.spawnInfo
        room.spawner.remandSpawn()
        updateState(MobilizeState.Boosting)
        return
    }

    // 空闲状态的 spawn
    const freeSpawn = room[STRUCTURE_SPAWN].filter(spawn => !spawn.spawning)

    if (freeSpawn.length <= 0) return

    // 开始执行孵化，这里不会判断是否孵化成功
    // 因为返回 OK 也有可能会被别人覆盖，等待下次执行本阶段时会检查是否存在未孵化成员
    freeSpawn.map((spawn, index) => {
        // spawn 比未孵化单位多
        const [creepName, { soliderRole, bodys }] = unSpawnMembers[index] || []
        if (!creepName) return
        spawn.spawnCreep(bodys, creepName, { memory: { soliderRole } as unknown as CreepMemory})
    })
}