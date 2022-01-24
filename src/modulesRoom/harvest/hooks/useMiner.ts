import { DelayTaskData } from '@/modulesGlobal/delayQueue'
import { createRoleController } from '@/modulesRoom/unitControl/controller'
import { createEnvContext, createStaticBody } from '@/utils'
import { MINE_LIMIT, DEFAULT_MINER_ROLE } from '../constants'
import { HarvestContext } from '../types'

/**
 * 生成 miner 的名字
 */
export const getMinerName = (roomName: string) => `${roomName} miner`

/**
 * 生成 miner 的身体
 */
export const getMinerBody = createStaticBody(
    [[WORK, 1], [CARRY, 1], [MOVE, 1]],
    [[WORK, 2], [CARRY, 2], [MOVE, 2]],
    [[WORK, 3], [CARRY, 3], [MOVE, 3]],
    [[WORK, 4], [CARRY, 4], [MOVE, 4]],
    [[WORK, 6], [CARRY, 6], [MOVE, 6]],
    [[WORK, 9], [CARRY, 9], [MOVE, 9]],
    [[WORK, 12], [CARRY, 6], [MOVE, 9]],
    [[WORK, 20], [CARRY, 8], [MOVE, 14]]
)

/**
 * 元素矿采集单位
 * 采集元素矿，然后存到 terminal 中
 */
export const useMiner = function (context: HarvestContext) {
    const {
        env, getMemory, withDelayCallback, getMineral, addSpawnTask, getResourceAmount,
        minerRole = DEFAULT_MINER_ROLE, addSpawnCallback, onCreepStageChange
    } = context

    /**
     * 延迟孵化 miner
     */
    const delaySpawnMiner = withDelayCallback('spawnMiner', ({ roomName }: DelayTaskData) => {
        const room = env.getRoomByName(roomName)
        // 房间或终端没了就不在孵化
        if (!room || !room.terminal) return

        // 满足以下条件时就延迟发布
        if (
            // cpu 不够
            env.getGame().cpu.bucket < 700 ||
            // 矿采太多了
            room.terminal.store[getMineral(room).mineralType] >= MINE_LIMIT
        ) {
            delaySpawnMiner({ roomName }, 1000)
            return
        }

        // 孵化采集单位
        releaseMiner(room)
    })

    const miner = createRoleController({
        getMemory: room => {
            const memory = getMemory(room)
            if (!memory.miners) memory.miners = {}
            return memory.miners
        },
        // 检查矿床里是不是还有矿
        onCreepDead: (creepName, memory, workRoom) => {
            const mineral = getMineral(workRoom)
            // 房间中的矿床是否还有剩余产量
            if (mineral.mineralAmount <= 0) {
                delaySpawnMiner({ roomName: workRoom.name }, mineral.ticksToRegeneration + 1)
                return false
            }

            const total = getResourceAmount(workRoom, mineral.mineralType)
            if (total < MINE_LIMIT) {
                // 需要重新孵化
                releaseMiner(workRoom)
                return
            }

            // 资源已经采集的足够多了，之后再采集
            delaySpawnMiner({ roomName: workRoom.name }, 50001)
        },
        /**
         * 采集元素矿
         */
        runSource: (creep, memory, workRoom) => {
            if (creep.store.getFreeCapacity() === 0) return true

            const mineral = getMineral(workRoom)
            // 找不到矿或者矿采集完了，魂归卡拉
            if (!mineral || mineral.mineralAmount <= 0) {
                creep.suicide()
                return
            }

            const harvestResult = creep.harvest(mineral)
            if (harvestResult === ERR_NOT_IN_RANGE) creep.goTo(mineral.pos)
        },
        /**
         * 运回存储建筑
         */
        runTarget: (creep, memory, workRoom) => {
            if (creep.store.getUsedCapacity() === 0) return true

            if (!workRoom.terminal) {
                creep.say('放哪？')
                return false
            }

            creep.goTo(workRoom.terminal.pos)
            const result = creep.transfer(workRoom.terminal, Object.keys(creep.store)[0] as ResourceConstant)
            return result === OK
        },
        onCreepStageChange
    })

    addSpawnCallback(minerRole, miner.addUnit)

    /**
     * 发布新元素矿采集单位
     *
     * @param room 要采集元素矿的房间
     */
    const releaseMiner = function (room: Room) {
        addSpawnTask(room, getMinerName(room.name), minerRole, getMinerBody(room.energyAvailable))
    }

    return { miner, releaseMiner }
}
