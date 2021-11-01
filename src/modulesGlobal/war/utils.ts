import { getUniqueKey } from "@/utils"
import { getBodyPart } from "./mobilizeManager/getBodyPart"
import { SquadType } from "./squadManager/types"

/**
 * 获取身体部件提供的威力
 * 
 * @param body 要计算的身体部件
 * @param methodName 执行的方法名称
 * @param basePower 基础威力
 * @returns 该身体部件提供的威力
 */
const calcBodyEffectiveness = function (body: BodyPartDefinition, methodName: string, basePower: number) {
    return (BOOSTS[body.type][body.boost]?.[methodName] || 0) * basePower + basePower
}

/**
 * 获取身体部件提供的治疗量
 * 
 * @returns [贴脸可以恢复的治疗量，三格之内可以恢复的治疗量
 */
const getBodyHeal = function (body: BodyPartDefinition<HEAL>): [number, number] {
    return [
        calcBodyEffectiveness(body, 'heal', HEAL_POWER),
        calcBodyEffectiveness(body, 'rangedHeal', RANGED_HEAL_POWER)
    ]
}

/**
 * 获取身体部件提供的伤害
 * 
 * @returns [贴脸可以造成的输出，三格之内可以造成的输出]
 */
const getBodyDamage = function (body: BodyPartDefinition<ATTACK | RANGED_ATTACK>): [number, number] {
    return [
        calcBodyEffectiveness(body, 'attack', ATTACK_POWER),
        calcBodyEffectiveness(body, 'rangedAttack', RANGED_HEAL_POWER)
    ]
}

/**
 * 计算 creep 可以提供的治疗量
 * 
 * @param creep 要计算的 creep
 * @param ranged 是否计算远距离
 */
export const getCreepHeal = function (creep: Creep): [number, number] {
    return creep.body
        .filter(({ type, hits }) => type === HEAL && hits > 0)
        .reduce((power, body) => {
            const [nearHeal, rangeHeal] = getBodyHeal(body as BodyPartDefinition<HEAL>)
            power[0] = power[0] + nearHeal
            power[1] = power[1] + rangeHeal
            return power
        }, [0, 0])
}

/**
 * 计算 creep 可以提供的伤害
 * 
 * @param creep 要计算的 creep
 * @param ranged 是否计算远距离
 */
export const getCreepDamage = function (creep: Creep): [number, number] {
    return creep.body
        .filter(({ type, hits }) => (type === ATTACK || type === RANGED_ATTACK) && hits > 0)
        .reduce((power, body) => {
            const [nearDamage, rangeDamage] = getBodyDamage(body as BodyPartDefinition<ATTACK | RANGED_ATTACK>)
            power[0] = power[0] + nearDamage
            power[1] = power[1] + rangeDamage
            return power
        }, [0, 0])
}

/**
 * 获取几个 creep 里伤害最高的
 * @return [伤害最高的 creep，能造成的伤害]
 */
export const getMaxDamageCreep = function (creeps: Creep[]): [Creep, number] {
    return creeps.reduce((maxCreepInfo, nextCreep) => {
        const [nextCreepDamage] = getCreepDamage(nextCreep)

        if (nextCreepDamage < maxCreepInfo[1]) return maxCreepInfo
        return [nextCreep, nextCreepDamage]
    }, [creeps[0], 0])
}

/**
 * 获取该 creep 所能承受的最大伤害
 * 这个最大伤害是指从身体最左侧开始数的 TOUGH 不见所能承受的伤害
 * 即多少伤害能击穿防御
 */
export const getMaxEndure = function (creep: Creep): number {
    let endureDamage = 0

    for (const body of creep.body) {
        if (body.type === MOVE) break
        if (body.hits <= 0) continue

        endureDamage += 100 / (BOOSTS[TOUGH][body.boost]?.damage || 1)
    }

    return endureDamage
}

/**
 * 默认小队代号
 */
export const DEFAULT_SQUAD_CODE = [
    'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet',
    'kilo', 'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango', 'uniform',
    'victor', 'whiskey', 'xray', 'yankee', 'zulu'
]

/**
 * 创建小队孵化信息
 * 
 * @param squadCode 小队代号
 * @param squadType 小队类型
 */
export const createSpawnInfo = function (squadCode: string, squadType: SquadType) {
    const bodys = getBodyPart[squadType]()
    const spawnInfo = {}
    bodys.forEach(body => spawnInfo[squadCode + getUniqueKey()] = body)
    return spawnInfo
}