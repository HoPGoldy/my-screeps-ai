import { bodyConfigs } from '../bodyConfigs'
import { createBodyGetter } from 'utils'

/**
 * 收集者
 * 从指定 source 中获取资源 > 将资源转移到指定建筑中
 */
const collector: CreepConfig<'collector'> = {
    prepare: creep => {
        const { sourceId } = creep.memory.data
        // 已经到附近了就准备完成
        if (creep.pos.isNearTo((Game.getObjectById(sourceId)).pos)) return true
        // 否则就继续移动
        else {
            creep.goTo(Game.getObjectById(sourceId).pos)
            return false
        }
    },
    source: creep => {
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return true

        const source = Game.getObjectById(creep.memory.data.sourceId)
        if (!source) {
            creep.say('目标找不到!')
            return false
        }

        const result = creep.harvest(source)

        if (result === ERR_NOT_IN_RANGE) creep.goTo(source.pos)
        else if (result === ERR_NOT_ENOUGH_RESOURCES) {
            // 如果满足下列条件就重新发送 regen_source 任务
            if (
                // creep 允许重新发布任务
                (!creep.memory.regenSource || creep.memory.regenSource < Game.time) &&
                // source 上没有效果
                (!source.effects || !source.effects[PWR_REGEN_SOURCE])
            ) {
                // 并且房间内的 pc 支持这个任务
                if (creep.room.memory.powers && creep.room.memory.powers.split(' ').includes(String(PWR_REGEN_SOURCE))) {
                    // 添加 power 任务，设置重新尝试时间
                    creep.room.addPowerTask(PWR_REGEN_SOURCE)
                    creep.memory.regenSource = Game.time + 300
                }
                else creep.memory.regenSource = Game.time + 1000
            }
        }

        // 快死了就把能量移出去
        if (creep.ticksToLive <= 3) return true
    },
    target: creep => {
        const target = Game.getObjectById(creep.memory.data.targetId)
        // 找不到目标了，自杀并重新运行发布规划
        if (!target) {
            creep.say('目标找不到!')
            creep.room.releaseCreep('harvester')
            creep.suicide()
            return false
        }

        if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) creep.goTo(target.pos)

        if (creep.store.getUsedCapacity() === 0) return true
    },
    bodys: createBodyGetter(bodyConfigs.worker)
}

export default collector