import { UPGRADER_WITH_ENERGY_LEVEL_8 } from 'setting'
import { bodyConfigs } from '../bodyConfigs'
import { calcBodyPart, createBodyGetter } from 'utils'

/**
 * 升级者
 * 不会采集能量，只会从指定目标获取能量
 * 从指定建筑中获取能量 > 升级 controller
 */
const upgrader: CreepConfigGenerator<'upgrader'> = data => ({
    isNeed: (room) => {
        if (!room.controller) return false
        // 小于 8 级就一直孵化
        if (room.controller.level < 8) return true
        // 大于 8 级就看 bucket，cpu 够就继续孵化
        else if (Game.cpu.bucket >= 700 && room.storage && room.storage.store[RESOURCE_ENERGY] > UPGRADER_WITH_ENERGY_LEVEL_8) return true

        return false
    },
    source: creep => {
        // 因为只会从建筑里拿，所以只要拿到了就去升级
        if (creep.store[RESOURCE_ENERGY] > 0) return true

        const source = Game.getObjectById(data.sourceId)

        // 如果能量来源是 container
        if (source && source.structureType === STRUCTURE_CONTAINER) {
            // 完全没能量很少见，可能是边上有 link 了（这时候 harvester 会把能量存到 link 里，就不再用 container 了）
            // 所以这里需要特殊判断一下，避免 upgrader 对着一个空的 container 发呆好几辈子
            if (source.store[RESOURCE_ENERGY] === 0) {
                const nearLinks = source.pos.findInRange(FIND_MY_STRUCTURES, 1, {
                    filter: s => s.structureType === STRUCTURE_LINK
                })
                // 已经造好 link 了，废弃空 container
                if (nearLinks.length > 0) {
                    source.destroy()
                    return false
                }
            }
            // 有能量但是太少，就等到其中能量大于指定数量再拿（优先满足 filler 的能量需求）
            else if (source.store[RESOURCE_ENERGY] <= 500) {
                creep.say('🎲')
                return false
            }
        }

        // 获取能量
        const result = creep.getEngryFrom(source)

        // 能量来源无法提供能量了, 自杀并重新运行 upgrader 发布规划, 从 Link 里获取能量的话，就不会重新运行规划
        if (
            (result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_INVALID_TARGET) &&
            (!source || source instanceof StructureTerminal || source instanceof StructureStorage)
        ) {
            // 有可能时之前遗留下来的建筑，里边能量用光后就没有利用价值了，直接摧毁
            if (source && !source.my) source.destroy()
            creep.room.releaseCreep('upgrader')
            creep.suicide()
        }
    },
    target: creep => {
        if (creep.upgrade() === ERR_NOT_ENOUGH_RESOURCES) return true
    },
    bodys: (room, spawn) => {
        // 7 级和 8 级时要孵化指定尺寸的 body
        if (room.controller && room.controller.my) {
            if (room.controller.level === 8) return calcBodyPart({ [WORK]: 12, [CARRY]: 12, [MOVE]: 12 })
            else if (room.controller.level === 7) return calcBodyPart({ [WORK]: 30, [CARRY]: 5, [MOVE]: 15 })
        }

        return createBodyGetter(bodyConfigs.worker)(room, spawn)
    }
})

export default upgrader