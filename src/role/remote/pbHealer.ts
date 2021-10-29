import { Color } from '@/modulesGlobal/console/utils'
import { hasCreep, removeCreep } from '@/modulesGlobal/creep/utils'
import { calcBodyPart } from '../bodyUtils'
import { CreepConfig, CreepRole } from '../types/role'

/**
 * PowerBank 治疗单位
 * 移动并治疗 pbAttacker, 请在 8 级时生成
 * @see doc "../doc/PB 采集小组设计案"
 * 
 * @property {} creepName 要治疗的 pbAttacker 的名字
 */
const pbHealer: CreepConfig<CreepRole.PbHealer> = {
    target: creep => {
        const targetCreep = Game.creeps[creep.memory.data.creepName]
        if (!targetCreep) {
            // 对象没了就殉情
            if (!hasCreep(creep.memory.data.creepName)) {
                creep.log(`找不到目标 ${creep.memory.data.creepName}，已自杀`, Color.Yellow)
                removeCreep(creep.name, { immediate: true })
            }
            else creep.say('等等我对象')
            return false
        }

        // 移动到身边了就治疗
        if (creep.pos.isNearTo(targetCreep)) creep.heal(targetCreep)
        else creep.goTo(targetCreep.pos, { range: 1, checkTarget: false })
    },
    bodys: () => calcBodyPart([[HEAL, 25], [MOVE, 25]])
}

export default pbHealer