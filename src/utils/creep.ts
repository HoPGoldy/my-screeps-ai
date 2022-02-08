/**
 * 从目标结构获取能量
 *
 * @param target 提供能量的结构
 * @returns 执行 harvest 或 withdraw 后的返回值
 */
export const getEngryFrom = function (creep: Creep, target: AllEnergySource): ScreepsReturnCode {
    let result: ScreepsReturnCode
    // 是建筑就用 withdraw
    if (target instanceof Structure) {
        // 如果建筑里没能量了就不去了，防止出现粘性
        if (target.store[RESOURCE_ENERGY] <= 0) return ERR_NOT_ENOUGH_ENERGY
        result = creep.withdraw(target as Structure, RESOURCE_ENERGY)
    }
    else if (target instanceof Resource) result = creep.pickup(target as Resource)
    // 不是的话就用 harvest
    else result = creep.harvest(target as Source)

    return result
}
