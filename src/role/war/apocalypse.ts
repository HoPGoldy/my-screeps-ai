import { calcBodyPart } from '@/utils'
import { battleBase, boostPrepare } from './configPart'

/**
 * 强化 - 重型作战单位
 * 本角色仅能在 RCL >= 7 时生成
 * 扛塔数量为 0 时依旧会携带 3 个强化 HEAL (144/T 的回复)，但是不会有 TOUGH
 * 
 * @param bearTowerNum 可以承受多少 tower 的最大伤害，该数值越少，攻击能力越强，默认为 6 (0~6)
 * @param flagName 要攻击的旗帜名称
 */
const apocalypse: CreepConfig<'apocalypse'> = {
    ...battleBase(),
    ...boostPrepare(),
    target: creep => {
        const { targetFlagName } = creep.memory.data

        // 获取旗帜
        const targetFlag = creep.getFlag(targetFlagName)
        if (!targetFlag) {
            creep.say('旗呢?')
            return false
        }

        // 治疗自己，不会检查自己生命值，一直治疗
        // 因为本 tick 受到的伤害只有在下个 tick 才能发现，两个 tick 累计的伤害足以击穿 tough。
        if (creep.getActiveBodyparts(HEAL)) creep.heal(creep)

        // 无脑移动
        creep.moveTo(targetFlag)

        if (creep.room.name == targetFlag.pos.roomName) {
            // 根据 massMode 选择不同给攻击模式
            if (creep.memory.massMode) creep.rangedMassAttack()
            else {
                const structures = targetFlag.pos.lookFor(LOOK_STRUCTURES)
                if (structures.length > 0) creep.rangedAttack(structures[0])
            }
        }
        else {
            creep.log(`不在指定房间，切入迁徙模式`)
            return true
        }
    },
    bodys: (room, spawn, data) => {
        // 越界就置为 6
        if (data.bearTowerNum < 0 || data.bearTowerNum > 6) data.bearTowerNum = 6
        // 扛塔等级和bodyPart的对应关系
        const bodyMap = {
            0: { [TOUGH]: 0, [RANGED_ATTACK]: 15, [MOVE]: 6, [HEAL]: 3 },
            1: { [TOUGH]: 2, [RANGED_ATTACK]: 15, [MOVE]: 6, [HEAL]: 5 },
            2: { [TOUGH]: 4, [RANGED_ATTACK]: 20, [MOVE]: 9, [HEAL]: 9 },
            3: { [TOUGH]: 6, [RANGED_ATTACK]: 21, [MOVE]: 10, [HEAL]: 13 },
            4: { [TOUGH]: 8, [RANGED_ATTACK]: 15, [MOVE]: 10, [HEAL]: 17 },
            5: { [TOUGH]: 10, [RANGED_ATTACK]: 9, [MOVE]: 10, [HEAL]: 21 },
            6: { [TOUGH]: 12, [RANGED_ATTACK]: 5, [MOVE]: 10, [HEAL]: 23 }
        }
        const bodyConfig: BodySet = bodyMap[data.bearTowerNum]

        return calcBodyPart(bodyConfig)
    }
}

export default apocalypse