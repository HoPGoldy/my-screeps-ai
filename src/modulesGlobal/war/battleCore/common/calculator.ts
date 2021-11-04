
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
 * @returns [贴脸可以恢复的治疗量，三格之内可以恢复的治疗量]
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
 * 计算 bodys 可以提供的治疗量
 * 
 * @returns [贴脸可以恢复的治疗量，三格之内可以恢复的治疗量]
 */
export const getCreepHeal = function (bodys: BodyPartDefinition[]): [number, number] {
    return bodys
        .filter(({ type, hits }) => type === HEAL && hits > 0)
        .reduce((power, body) => {
            const [nearHeal, rangeHeal] = getBodyHeal(body as BodyPartDefinition<HEAL>)
            power[0] = power[0] + nearHeal
            power[1] = power[1] + rangeHeal
            return power
        }, [0, 0])
}

/**
 * 计算 bodys 可以提供的伤害
 * 
 * @returns [贴脸伤害，三格之内的伤害]
 */
export const getCreepDamage = function (bodys: BodyPartDefinition[]): [number, number] {
    return bodys
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
        const [nextCreepDamage] = getCreepDamage(nextCreep.body)

        if (nextCreepDamage < maxCreepInfo[1]) return maxCreepInfo
        return [nextCreep, nextCreepDamage]
    }, [creeps[0], 0])
}

/**
 * 获取该 creep 所能承受的最大伤害
 * 这个最大伤害是指从身体最左侧开始数的 TOUGH 部件所能承受的伤害
 * 即多少伤害能击穿防御
 */
export const getMaxEndure = function (creep: Creep): number {
    let endureDamage = 0

    for (const body of creep.body) {
        if (body.type !== TOUGH) break
        if (body.hits <= 0) continue

        endureDamage += 100 / (BOOSTS[TOUGH][body.boost]?.damage || 1)
    }

    return endureDamage
}

/**
 * 获取一个 creep 下个 tick 的治疗量
 */
 export const getNextHeal = function (creep: Creep) {
    // 这里用 compose 写会更好的...但是不确定 screeps 里用函数式库会不会有啥性能问题
    return getCreepHeal(getRemainingBodyByHits(creep, getRemainingHitsByDamage(creep, getRealDamage(creep))))
}

/**
 * 当 creep 只剩下指定血量时还剩那些可用的 body
 */
export const getRemainingBodyByHits = function (creep: Creep, hits: number): BodyPartDefinition[] {
    const breakHits = creep.hitsMax - hits
    const breakBodyLength = Math.floor(breakHits / 100)
    return creep.body.slice(breakBodyLength)
}

/**
 * 给 creep 应用一个伤害，并计算剩余血量
 * 模拟 creep 被功击时的情况
 */
export const getRemainingHitsByDamage = function (creep: Creep, damage: number) {
    let remainingHits = creep.hits
    let remainingDamage = damage

    for (const { hits, boost, type } of creep.body) {
        if (hits <= 0) continue

        const damageCarry = (type === TOUGH && boost) ?
            hits / (BOOSTS[TOUGH][boost]?.damage || 1) : hits

        remainingDamage -= damageCarry
        remainingHits -= damageCarry

        if (remainingDamage <= 0 || remainingHits <= 0) break
    }

    return remainingHits < 0 ? 0 : remainingHits
}

declare global {
    interface Creep {
        _realDamage: number
    }
}

/**
 * 获取 creep 受到的真实伤害
 * 因为 tough 有减伤效果，所以 hitsMax - hits 并不等于受到的真实伤害
 */
export const getRealDamage = function (creep: Creep) {
    if (creep._realDamage) return creep._realDamage
    if (creep.hits >= creep.hitsMax) return 0

    let getRealHealNumber = 0
    for (const item of creep.body) {
        if (item.hits >= 100) continue

        if (item.type == TOUGH && item.boost) {
            getRealHealNumber += ((100 - item.hits) / (BOOSTS[TOUGH][item.boost]?.damage || 1))
        } else {
            getRealHealNumber += (100 - item.hits)
        }
    }

    return creep._realDamage = getRealHealNumber
}
