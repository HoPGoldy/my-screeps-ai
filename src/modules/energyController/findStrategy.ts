/**
 * getAvailableSource 中，建筑存储中能量大于多少才会被当作目标
 */
const ENERGY_USE_LIMIT = {
    [STRUCTURE_TERMINAL]: 10000,
    [STRUCTURE_STORAGE]: 100000,
    [STRUCTURE_CONTAINER]: 400,
    [RESOURCE_ENERGY]: 50
}

/**
 * 获取目标中的能量数量，用于抹平差异
 */
const getEnergyAmount = function (target: EnergyTarget) {
    if ('store' in target) return target.store[RESOURCE_ENERGY]
    else if ('amount' in target) return target.amount
    else return 0
}

/**
 * 获取目标的类型，用于抹平差异
 */
const getTargetType = function (target: EnergyTarget) {
    if ('structureType' in target) return target.structureType
    else if ('resourceType' in target) return target.resourceType
    else return undefined
}

/**
 * 查找器 - 找到最多的能量来源
 */
export const getMax: EnergyTargetFinder = targets => _.max(targets, getEnergyAmount)

/**
 * 生成查找器 - 找到离目标位置最近的能量来源
 * 
 * @param pos 目标位置
 */
export const getClosestTo: (pos: RoomPosition) => EnergyTargetFinder = pos => {
    return targets => pos.findClosestByPath(targets)
}

/**
 * 过滤器 - 优先保证来源中能量大于指定值
 */
export const withLimit: EnergyTargetFilter = targets => {
    return targets.filter(target => getEnergyAmount(target) > ENERGY_USE_LIMIT[getTargetType(target)])
}

export default { getMax, getClosestTo, withLimit }