import { battleBase } from './configPart'
import { bodyConfigs } from '../bodyConfigs'
import { createBodyGetter } from 'utils'

/**
 * 拆除者
 * 会一直向旗帜发起进攻，拆除旗帜下的建筑
 * 
 * @param spawnRoom 出生房间名称
 * @param flagName 要攻击的旗帜名称
 * @param standByFlagName 待命旗帜名称，本角色会优先抵达该旗帜, 直到该旗帜被移除
 */
const dismantler: CreepConfig<'dismantler'> = {
    ...battleBase(),
    target: creep => {
        const { targetFlagName, healerName } = creep.memory.data as RoleDatas['dismantler']
        return creep.dismantleFlag(targetFlagName, healerName)
    },
    bodys: createBodyGetter(bodyConfigs.dismantler)
}

export default dismantler