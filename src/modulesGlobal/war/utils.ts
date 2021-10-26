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
 */
const getBodyHeal = function (body: BodyPartDefinition<HEAL>, ranged: boolean = false): number {
    return calcBodyEffectiveness(body, ranged ? 'rangedHeal' : 'heal', ranged ? RANGED_HEAL_POWER : HEAL_POWER)
}

/**
 * 获取身体部件提供的伤害
 */
const getBodyDamage = function (body: BodyPartDefinition<ATTACK | RANGED_ATTACK>, ranged: boolean = false): number {
    if (body.type === ATTACK) {
        if (ranged) return 0
        else return calcBodyEffectiveness(body, 'attack', ATTACK_POWER)
    }
    
    return calcBodyEffectiveness(body, 'rangedAttack', RANGED_HEAL_POWER)
}

/**
 * 计算 creep 可以提供的治疗量
 * 
 * @param creep 要计算的 creep
 * @param ranged 是否计算远距离
 */
export const getCreepHeal = function (creep: Creep, ranged: boolean = false): number {
    return creep.body
        .filter(({ type, hits }) => type === HEAL && hits > 0)
        .reduce((power, body) => {
            return power + getBodyHeal(body as BodyPartDefinition<HEAL>, ranged)
        }, 0)
}

/**
 * 计算 creep 可以提供的伤害
 * 
 * @param creep 要计算的 creep
 * @param ranged 是否计算远距离
 */
export const getCreepDamage = function (creep: Creep, ranged: boolean = false): number {
    return creep.body
        .filter(({ type, hits }) => (type === ATTACK || type === RANGED_ATTACK) && hits > 0)
        .reduce((power, body) => {
            return power + getBodyDamage(body as BodyPartDefinition<ATTACK | RANGED_ATTACK>, ranged)
        }, 0)
}

/**
 * 获取几个 creep 里伤害最高的
 * @return [伤害最高的 creep，能造成的伤害]
 */
export const getMaxDamageCreep = function (creeps: Creep[]): [Creep, number] {
    return creeps.reduce((maxCreepInfo, nextCreep) => {
        const nextCreepDamage = getCreepDamage(nextCreep)

        if (nextCreepDamage < maxCreepInfo[1]) return maxCreepInfo
        return [nextCreep, nextCreepDamage]
    }, [creeps[0], 0])
}

/**
 * 默认小队代号
 */
export const DEFAULT_SQUAD_CODE = [
    'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet',
    'Kilo', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform',
    'Victor', 'Whiskey', 'Xray', 'Yankee', 'Zulu'
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