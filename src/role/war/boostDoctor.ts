import { calcBodyPart } from '../bodyUtils'
import { CreepConfig, CreepRole } from '../types/role'

/**
 * 强化 - HEAL
 * 7 级以上可用, 25HEAL 25MOVE
 * 详情见 role.doctor
 * 
 * @param creepsName 要治疗的 creep 名称
 */
const boostDoctor: CreepConfig<CreepRole.BoostDoctor> = {
    isNeed: (room, preMemory) => preMemory.data.keepSpawn,
    target: creep => {
        const target = Game.creeps[creep.memory.data.creepName]
        if (!target) {
            creep.say('💤')
            return false
        }
        creep.healTo(target)
        return false
    },
    bodys: () => calcBodyPart({ [TOUGH]: 12, [HEAL]: 25, [MOVE]: 10 })
}

export default boostDoctor