import { bodyConfigs } from 'setting'
import { createBodyGetter } from 'utils'
import { getRoomTransferTask, transferTaskOperations } from './transferTaskOperations'

/**
 * manager 触发后事处理的最小生命
 */
const TRANSFER_DEATH_LIMIT = 20

/**
 * 房间物流运输者
 * 执行 ROOM_TRANSFER_TASK 中定义的任务
 * 任务处理逻辑定义在 transferTaskOperations 中
 */
const manager: CreepConfigGenerator<'manager'> = data => ({
    source: creep => {
        if (creep.ticksToLive <= TRANSFER_DEATH_LIMIT) return deathPrepare(creep, data.sourceId)

        const task = getRoomTransferTask(creep.room)

        // 有任务就执行
        if (task) return transferTaskOperations[task.type].source(creep, task, data.sourceId)
        else creep.say('💤')
    },
    target: creep => {
        const task = getRoomTransferTask(creep.room)

        // 有任务就执行
        if (task) return transferTaskOperations[task.type].target(creep, task)
        else return true
    },
    bodys: createBodyGetter(bodyConfigs.manager)
})



/**
 * 快死时的后事处理
 * 将资源存放在对应的地方
 * 存完了就自杀
 * 
 * @param creep manager
 * @param sourceId 能量存放处
 */
const deathPrepare = function(creep: Creep, sourceId: Id<EnergySourceStructure>): false {
    if (creep.store.getUsedCapacity() > 0) {
        for (const resourceType in creep.store) {
            let target: EnergySourceStructure
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