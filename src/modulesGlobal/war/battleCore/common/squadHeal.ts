import { getNextHeal } from "./calculator";

/**
 * 受伤单位信息
 */
interface WoundedInfo {
    /**
     * 受伤的 creep 实例
     */
    creep: Creep
    /**
     * 受到的伤害
     */
    damage: number
}

/**
 * 治疗单位信息
 */
interface DoctorInfo {
    /**
     * 奶 creep 实例
     */
    creep: Creep
    /**
     * 下个 tick 能治疗的值
     * 注意这里的治疗量是下个 tick 的治疗量，因为 screeps 每 tick 开始时会先计算伤害，再拿被打之后的身体计算治疗量
     * 如果拿本 tick 的身体部件来计算治疗量的话，就会出现明明算的能奶但是下个 tick HEAL 被打掉导致奶不出来的问题
     */
    heal: number
    /**
     * 是否使用了治疗
     */
    usedHeal: boolean
}

/**
 * 传入几个 creep，并进行相互治疗
 * @todo 还没写自动治疗
 */
export const squadHealMember = function (members: Creep[]) {
    // 所有掉血的队员
    const wounded: WoundedInfo[] = members
        .filter(c => c.hits < c.hitsMax)
        .map(creep => ({ creep, damage: creep.hitsMax - creep.hits }))
        .sort((a, b) => b.damage - a.damage)

    // 所有能奶人的队员
    const doctors: DoctorInfo[] = members
        .map(creep => ({ creep, heal: getNextHeal(creep)[0], usedHeal: false }))
        .filter(({ heal }) => heal > 0)
        .sort((a, b) => b.heal - a.heal)

    // 没人掉血就继续往前走
    if (wounded.length == 0) return false

    // 下个 tick 奶不满了就撤退
    const needFlee = _.sum(wounded.map(c => c.damage)) - _.sum(doctors.map(c => c.heal)) > 0;

    for (const woundedInfo of wounded) {
        const { creep: injuredCreep, damage } = woundedInfo

        // n 平方找最优治疗方案
        for (let i = 0; i < doctors.length; i++) {
            if (damage == 0) continue;

            let healerInfo: DoctorInfo
            for (const doctorInfo of doctors) {
                const { creep: healCreep, heal, usedHeal } = doctorInfo

                // 奶够了不奶
                if (damage <=0 || heal == 0 || usedHeal) continue
                // 如果摸不到就不奶
                if (injuredCreep != healCreep && !healCreep.pos.isNearTo(injuredCreep)) continue

                healerInfo = doctorInfo;
                if (damage < heal) break;
            }
            if (healerInfo) {
                healerInfo.creep.heal(injuredCreep)
                healerInfo.usedHeal = true
                woundedInfo.damage -= healerInfo.heal
                healerInfo.heal = 0
            }
        }
    }

    return needFlee
}
