/**
 * 计算身体孵化要消耗的能量
 *
 * @param bodys 要计算的身体数组
 * @returns 孵化要消耗的数量
 */
export const getBodySpawnEnergy = function (bodys: BodyPartConstant[]): number {
    return bodys.reduce((cost, body) => cost + BODYPART_COST[body], 0)
}

/**
 * 根据身体配置生成完成的身体数组
 * cpu 消耗: 0.028 左右
 *
 * @param bodySet 身体部件配置对象
 */
export const calcBodyPart = function (bodySets: BodyRepeat[]): BodyPartConstant[] {
    // 把身体配置项拓展成如下形式的二维数组
    // [ [ TOUGH ], [ WORK, WORK ], [ MOVE, MOVE, MOVE ] ]
    const bodys = bodySets.map(([bodyPart, length]) => Array(length).fill(bodyPart))
    // 把二维数组展平
    return [].concat(...bodys)
}

/**
 * 简写版本的 bodyPart[]，格式如下：
 * @example [[TOUGH, 3], [WORK, 4], [MOVE, 7]]
 */
export type BodyRepeat = [BodyPartConstant, number]

/**
 * 计算身体部件需要的强化资源数量
 *
 * @param bodys 要强化的身体部件数组
 * @param boostConfig 身体部件强化所使用的资源
 */
export const getBodyBoostResource = function (
    bodys: BodyPartConstant[],
    boostConfig: { [bodyType in BodyPartConstant]?: MineralBoostConstant }
): BoostResourceConfig[] {
    const boostAmounts: { [type in MineralBoostConstant]?: number } = {}

    bodys.forEach(body => {
        if (!(body in boostConfig)) return
        boostAmounts[boostConfig[body]] = (boostAmounts[boostConfig[body]] || 0) + LAB_BOOST_MINERAL
    })

    return Object.entries(boostAmounts).map(([res, amount]) => ({
        resource: res as MineralBoostConstant,
        amount
    }))
}

/**
 * 强化任务的材料清单
 */
export interface BoostResourceConfig {
    /**
     * 强化材料类型
     */
    resource: MineralBoostConstant
    /**
     * 强化材料数量
     */
    amount: number
}
