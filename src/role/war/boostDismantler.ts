import { calcBodyPart } from 'utils'
import { battleBase, boostPrepare } from './utils'

/**
 * 强化 - 拆除者
 * 7 级以上可用, 12TOUGH 28WORK 10MOVE
 * 详情见 role.dismantler，请配合 boostDoctor 使用
 * 
 * @param spawnRoom 出生房间名称
 * @param flagName 要攻击的旗帜名称
 * @param standByFlagName 待命旗帜名称，本角色会优先抵达该旗帜, 直到该旗帜被移除
 */
const boostDismantler: CreepConfigGenerator<'boostDismantler'> = data => ({
    ...battleBase(data.targetFlagName, data.keepSpawn),
    ...boostPrepare(),
    target: creep => creep.dismantleFlag(data.targetFlagName, data.healerName),
    bodys: () => calcBodyPart({ [TOUGH]: 12, [WORK]: 28, [MOVE]: 10 })
})

export default boostDismantler