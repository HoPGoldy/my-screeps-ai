import { minerHervesteLimit } from 'setting'
import { bodyConfigs } from '../bodyConfigs'
import { createBodyGetter } from 'utils'

/**
 * 矿工
 * 从房间的 mineral 中获取资源 > 将资源转移到指定建筑中(默认为 terminal)
 */
const miner: CreepConfig<'miner'> = {
    // 检查矿床里是不是还有矿
    isNeed: room => {
        // 房间中的矿床是否还有剩余产量
        if (room.mineral.mineralAmount <= 0) {
            room.memory.mineralCooldown = Game.time + MINERAL_REGEN_TIME
            return false
        }

        // 再检查下终端存储是否已经太多了, 如果太多了就休眠一段时间再出来看看
        if (!room.terminal || room.terminal.store.getUsedCapacity() >= minerHervesteLimit) {
            room.memory.mineralCooldown = Game.time + 10000
            return false
        }
        
        return true
    },
    prepare: creep => {
        creep.goTo(creep.room.mineral.pos)

        // 如果移动到了就准备完成并保存移动时间
        if (creep.pos.isNearTo(creep.room.mineral.pos)) {
            creep.memory.travelTime = CREEP_LIFE_TIME - creep.ticksToLive
            return true
        }

        return false
    },
    source: creep => {
        if (creep.ticksToLive <= creep.memory.travelTime + 30) return true
        else if (creep.store.getFreeCapacity() === 0) return true

        // 采矿
        const harvestResult = creep.harvest(creep.room.mineral)
        if (harvestResult === ERR_NOT_IN_RANGE) creep.goTo(creep.room.mineral.pos)
    },
    target: creep => {
        const target: StructureTerminal = creep.room.terminal
        if (!target) {
            creep.say('放哪？')
            return false
        }
        // 转移/移动
        if (creep.transfer(target, Object.keys(creep.store)[0] as ResourceConstant) == ERR_NOT_IN_RANGE) creep.goTo(target.pos)

        if (creep.store.getUsedCapacity() === 0) return true
    },
    bodys: createBodyGetter(bodyConfigs.worker)
}

export default miner