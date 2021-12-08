import { bodyConfigs, createBodyGetter } from '../bodyUtils'
import { withDelayCallback } from '@/mount/global/delayQueue'
import { removeCreep } from '@/modulesGlobal/creep/utils'
import { CreepConfig, CreepRole } from '../types/role'
import { DelayTaskData } from '@/modulesGlobal/delayQueue'

/**
 * miner 的矿物采集上限
 * 当房间中的对应矿物资源多于这个值时，miner 将不再继续采矿
 */
const MINE_LIMIT = 100000

/**
 * 延迟孵化 miner
 */
const delaySpawnMiner = withDelayCallback('spawnMiner', ({ roomName }: DelayTaskData) => {
    const room = Game.rooms[roomName]
    // 房间或终端没了就不在孵化
    if (!room || !room.terminal) return

    // 满足以下条件时就延迟发布
    if (
        // cpu 不够
        Game.cpu.bucket < 700 ||
        // 矿采太多了
        room.terminal.store[room.mineral.mineralType] >= MINE_LIMIT
    ) {
        delaySpawnMiner({ roomName }, 1000)
        return
    }

    // 孵化采集单位
    room.spawner.release.miner()
})

/**
 * 元素矿采集单位
 * 采集元素矿，然后存到 terminal 中
 */
const miner: CreepConfig<CreepRole.Miner> = {
    // 检查矿床里是不是还有矿
    isNeed: room => {
        // 房间中的矿床是否还有剩余产量
        if (room.mineral.mineralAmount <= 0) {
            delaySpawnMiner({ roomName: room.name }, room.mineral.ticksToRegeneration + 1)
            return false
        }

        const { total } = room.storageController.getResource(room.mineral.mineralType)
        if (total < MINE_LIMIT) return true

        // 资源已经采集的足够多了，之后再采集
        delaySpawnMiner({ roomName: room.name }, 50001)
        return false
    },
    source: creep => {
        if (creep.store.getFreeCapacity() === 0) return true

        const mineral = Game.rooms[creep.memory.data.workRoom]?.mineral
        // 找不到矿或者矿采集完了，添加延迟孵化并魂归卡拉
        if (!mineral || mineral.mineralAmount <= 0) {
            delaySpawnMiner({ roomName: mineral.room.name }, mineral.ticksToRegeneration + 1)
            removeCreep(creep.name, { immediate: true })
        }

        const harvestResult = creep.harvest(mineral)
        if (harvestResult === ERR_NOT_IN_RANGE) creep.goTo(mineral.pos)
    },
    target: creep => {
        if (creep.store.getUsedCapacity() === 0) return true

        const target: StructureTerminal = Game.rooms[creep.memory.data.workRoom]?.terminal
        if (!target) {
            creep.say('放哪？')
            return false
        }

        creep.transferTo(target, Object.keys(creep.store)[0] as ResourceConstant)
    },
    bodys: (room, spawn) => createBodyGetter(bodyConfigs.worker)(room, spawn)
}

export default miner
