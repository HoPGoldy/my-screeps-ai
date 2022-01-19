import { getFreeSpace, serializePos, unserializePos } from '@/utils'
import { HarvestContext, HarvesterActionStrategy, HarvesterMemory, HarvestMode } from '../types'

/**
 * 能量矿采集：转移模式
 *
 * 在 link 不存在时切换为启动模式
 * 采集能量 > 存放到指定建筑（在 memory.data.targetId 未指定是为 link）
 */
export const useHarvesterTransport = function (context: HarvestContext): HarvesterActionStrategy {
    const { env, requestPowerSource } = context

    return {
        prepare: (creep, source, memory) => {
            const storeStructure = Game.getObjectById(memory.storeId)

            // 目标没了，变更为启动模式
            if (!storeStructure) {
                delete memory.storeId
                memory.mode = HarvestMode.Start
                return false
            }

            let targetPos: RoomPosition
            if (memory.standPos) {
                targetPos = unserializePos(memory.standPos)
            }
            else {
                // 移动到 link 和 source 相交的位置，这样不用移动就可以传递能量
                targetPos = getFreeSpace(source.pos).find(pos => pos.isNearTo(storeStructure.pos))
                // 缓存起来供以后使用
                if (targetPos) memory.standPos = serializePos(targetPos)
            }

            creep.goTo(targetPos || source.pos, { range: 0 })

            // 如果没有找到又挨着 source 又挨着目标建筑的位置，走到 source 附近就算完成，找到了的话要走到位置上才算完成
            return targetPos ? creep.pos.isEqualTo(targetPos) : creep.pos.isNearTo(source.pos)
        },
        source: (creep, source, memory) => {
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return true

            const result = creep.harvest(source)
            if (result === ERR_NOT_IN_RANGE) creep.goTo(source.pos, { range: 1 })
            else if (result === ERR_NOT_ENOUGH_RESOURCES) {
                const { time } = env.getGame()
                // 如果满足下列条件就重新发送 regen_source 任务
                if (
                    // creep 允许重新发布任务
                    (!memory.regenSource || memory.regenSource < time) &&
                    // source 上没有效果
                    (!source.effects || !source.effects[PWR_REGEN_SOURCE])
                ) {
                    // 添加 power 任务
                    const requestSuccess = requestPowerSource(source)
                    // 添加失败了的话就把重试间隔设长一点
                    memory.regenSource = time + (requestSuccess ? 300 : 1000)
                }
            }

            // 快死了就把能量移出去
            if (creep.ticksToLive < 2) return true
        },
        target: (creep, source, memory) => {
            const target = Game.getObjectById(memory.storeId)

            // 目标没了，变更为启动模式
            if (!target) {
                delete memory.storeId
                memory.mode = HarvestMode.Start
                return true
            }

            const result = creep.transfer(target, RESOURCE_ENERGY)

            if (result === OK) return true
            else if (result === ERR_NOT_IN_RANGE) creep.goTo(target.pos)
            else if (result !== ERR_FULL) {
                env.log.warning(`${creep} 能量转移失败，transfer 错误码 ${result}`)
            }
        }
    }
}
