import { battleBase } from './configPart'
import { bodyConfigs, createBodyGetter } from '../bodyUtils'
import { CreepConfig, CreepRole } from '../types/role'

/**
 * 拆除者
 * 会一直向旗帜发起进攻，拆除旗帜下的建筑
 * 
 * @param flagName 要攻击的旗帜名称
 * @param standByFlagName 待命旗帜名称，本角色会优先抵达该旗帜, 直到该旗帜被移除
 */
const dismantler: CreepConfig<CreepRole.Dismantler> = {
    ...battleBase(),
    target: creep => {
        const { targetFlagName, healerName } = creep.memory.data
        return creep.dismantleFlag(targetFlagName, healerName)
    },
    bodys: createBodyGetter(bodyConfigs.dismantler)
}

export default dismantler