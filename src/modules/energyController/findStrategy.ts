/**
 * getAvailableSource 中，建筑存储中能量大于多少才会被当作目标
 */
const ENERGY_USE_LIMIT = {
    [STRUCTURE_TERMINAL]: 10000,
    [STRUCTURE_STORAGE]: 100000,
    [STRUCTURE_CONTAINER]: 400,
    [RESOURCE_ENERGY]: 100
}

/**
 * 查找器 - 找到最多的能量来源
 */
export const getMax: EnergyTargetFinder = targets => _.max(targets, target => target.amount)

/**
 * 过滤器 - 优先保证来源中能量大于指定值
 */
export const withLimit: EnergyTargetFilter = targets => {
    return targets.filter(target => target.amount > ENERGY_USE_LIMIT[target.type])
}

export default { getMax, withLimit }