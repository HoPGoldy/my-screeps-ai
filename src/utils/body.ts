/**
 * 计算身体孵化要消耗的能量
 *
 * @param bodys 要计算的身体数组
 * @returns 孵化要消耗的数量
 */
export const getBodySpawnEnergy = function (bodys: BodyPartConstant[]): number {
    return bodys.reduce((cost, body) => cost + BODYPART_COST[body], 0)
}
