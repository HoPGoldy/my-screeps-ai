import { bodyConfigs } from '../bodyConfigs'
import { createBodyGetter } from '@/utils'
import { delayQueue } from '@/modulesGlobal/delayQueue'
import { MINE_LIMIT } from '@/setting'
import { removeCreep } from '@/modulesGlobal/creep/utils'
import { DelayTaskType } from '@/modulesGlobal/delayQueue/types'

/**
 * 元素矿采集单位
 * 采集元素矿，然后存到 terminal 中
 */
const miner: CreepConfig<'miner'> = {
    // 检查矿床里是不是还有矿
    isNeed: room => {
        // 房间中的矿床是否还有剩余产量
        if (room.mineral.mineralAmount <= 0) {
            addSpawnMinerTask(room.name, room.mineral.ticksToRegeneration)
            return false
        }

        // 再检查下终端存储是否已经太多了, 如果太多了就休眠一段时间再出来看看
        if (!room.terminal || room.terminal.store.getUsedCapacity() >= MINE_LIMIT) {
            addSpawnMinerTask(room.name, 10000)
            return false
        }

        return true
    },
    source: creep => {
        if (creep.store.getFreeCapacity() === 0) return true

        const mineral = Game.rooms[creep.memory.data.workRoom]?.mineral
        // 找不到矿或者矿采集完了，添加延迟孵化并魂归卡拉
        if (!mineral || mineral.mineralAmount <= 0) {
            addSpawnMinerTask(mineral.room.name, mineral.ticksToRegeneration)
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

/**
 * 注册 miner 的延迟孵化任务
 */
delayQueue.addDelayCallback(DelayTaskType.SpawnMiner, room => {
    // 房间或终端没了就不在孵化
    if (!room || !room.terminal) return

    // 满足以下条件时就延迟发布
    if (
        // cpu 不够
        Game.cpu.bucket < 700 ||
        // 矿采太多了
        room.terminal.store[room.mineral.mineralType] >= MINE_LIMIT
    ) return addSpawnMinerTask(room.name, 1000)

    // 孵化采集单位
    room.spawner.release.miner()
})

/**
 * 添加 miner 的延迟孵化任务
 * @param roomName 添加到的房间名
 * @param delayTime 要延迟的时间，一般都是 mineal 的重生时间
 */
const addSpawnMinerTask = function (roomName: string, delayTime: number) {
    delayQueue.addDelayTask(DelayTaskType.SpawnMiner, { roomName }, delayTime + 1)
}

export default miner