import { bodyConfigs } from 'setting'
import { createBodyGetter } from 'utils'
import { battleBase } from './utils'

/**
 * 士兵
 * 会一直向旗帜发起进攻,
 * 优先攻击旗帜 3*3 范围内的 creep, 没有的话会攻击旗帜所在位置的建筑
 */
const soldier: CreepConfigGenerator<'soldier'> = data => ({
    ...battleBase(data.targetFlagName, data.keepSpawn),
    target: creep => {
        creep.attackFlag(data.targetFlagName)

        const targetFlag = creep.getFlag(data.targetFlagName)
        if (!targetFlag) {
            creep.say('旗呢?')
            return false
        }

        if (creep.room.name !== targetFlag.pos.roomName) {
            creep.log(`不在指定房间，切入迁徙模式`)
            return true
        }
        return false
    },
    bodys: createBodyGetter(bodyConfigs.attacker)
})

export default soldier