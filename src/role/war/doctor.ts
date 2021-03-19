import { bodyConfigs } from '../bodyConfigs'
import { createBodyGetter } from '@/utils'

/**
 * 医生
 * 一直治疗给定的 creep
 * 
 * @param creepsName 要治疗的 creep 名称
 * @param standByFlagName 待命旗帜名称，本角色会优先抵达该旗帜, 直到目标 creep 出现
 */
const doctor: CreepConfig<'doctor'> = {
    isNeed: (room, preMemory) => preMemory.data.keepSpawn,
    prepare: creep => {
        // 治疗单位不允许发起对穿
        creep.memory.disableCross = true
        return true
    },
    target: creep => {
        const target = Game.creeps[creep.memory.data.creepName]
        if (!target) {
            creep.say('💤')
            return false
        }
        creep.healTo(target)
        return false
    },
    bodys: createBodyGetter(bodyConfigs.healer)
}

export default doctor