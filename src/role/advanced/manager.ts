import { bodyConfigs } from '../bodyConfigs'
import { createBodyGetter } from 'utils'

/**
 * manager 触发后事处理的最小生命
 */
const TRANSFER_DEATH_LIMIT = 20

/**
 * 房间物流运输者
 * 执行 ROOM_TRANSFER_TASK 中定义的任务
 * 任务处理逻辑定义在 transferTaskOperations 中
 */
const manager: CreepConfig<'manager'> = {
    source: creep => {
        const { sourceId, workRoom } = creep.memory.data
        if (creep.ticksToLive <= TRANSFER_DEATH_LIMIT) return deathPrepare(creep, sourceId)

        return Game.rooms[workRoom]?.transport.getWork(creep).source()
    },
    target: creep => {
        const { workRoom } = creep.memory.data
        return Game.rooms[workRoom]?.transport.getWork(creep).target()
    },
    bodys: createBodyGetter(bodyConfigs.manager)
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