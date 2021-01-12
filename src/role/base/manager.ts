import { bodyConfigs, specialBodyConfig } from '../bodyConfigs'
import { createBodyGetter } from 'utils'

/**
 * manager 触发后事处理的最小生命
 */
const TRANSFER_DEATH_LIMIT = 20

/**
 * 搬运工，运营单位
 * 负责填充 extension、spawn、tower、lab 等资源运输任务
 * 任务处理逻辑定义在 modules/roomTask/transport/actions 中
 */
const manager: CreepConfig<'manager'> = {
    // 如果还有要做的任务的话就继续孵化
    isNeed: (room, preMemory) => !!preMemory.taskKey,
    prepare: creep => {
        creep.memory.bodyType = creep.memory.data.bodyType
        return true
    },
    source: creep => {
        const { sourceId, workRoom } = creep.memory.data
        if (creep.ticksToLive <= TRANSFER_DEATH_LIMIT) return deathPrepare(creep, sourceId)

        return Game.rooms[workRoom]?.transport.getWork(creep).source()
    },
    target: creep => {
        const { workRoom } = creep.memory.data
        return Game.rooms[workRoom]?.transport.getWork(creep).target()
    },
    bodys: (room, spawn, data) => {
        // 指定了特殊身体部件的话就生成对应的
        if (data.bodyType) return specialBodyConfig[data.bodyType](room, spawn)
        // 否则就使用默认的身体部件
        return createBodyGetter(bodyConfigs.manager)(room, spawn)
    }
}

/**
 * 快死时的后事处理
 * 将资源存放在对应的地方
 * 存完了就自杀
 * 
 * @param creep manager
 * @param sourceId 能量存放处
 */
const deathPrepare = function(creep: Creep, sourceId: Id<StructureWithStore>): false {
    if (creep.store.getUsedCapacity() > 0) {
        for (const resourceType in creep.store) {
            let target: StructureWithStore
            // 不是能量就放到 terminal 里
            if (resourceType != RESOURCE_ENERGY && resourceType != RESOURCE_POWER && creep.room.terminal) {
                target = creep.room.terminal
            }
            // 否则就放到 storage 或者玩家指定的地方
            else target = sourceId ? Game.getObjectById(sourceId): creep.room.storage

            // 转移资源
            creep.goTo(target.pos)
            creep.transfer(target, <ResourceConstant>resourceType)
            
            return false
        }
    }
    else creep.suicide()

    return false
}

export default manager