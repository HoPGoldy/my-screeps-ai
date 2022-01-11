import { BLACK_LIST } from './constants'

/**
 * 计算合成指定目标产物需要多少材料
 * 没有对对应关系进行验证，请保证产物和材料之间存在合成关系
 *
 * @param targetResource 要合成的目标产物类型
 * @param targetAmount 要合成的目标产物数量
 * @param subResource 要查询的合成材料类型
 */
export const clacSubResourceAmount = function (targetResource: CommodityConstant, targetAmount: number, subResource: ResourceConstant): number {
    const subResources = COMMODITIES[targetResource].components
    // 目标数量除于单次合成数量，向上取整后乘以单次合成所需的材料数量
    return subResources[subResource] * Math.ceil(targetAmount / COMMODITIES[targetResource].amount)
}

/**
 * 检查资源是否位于黑名单中
 *
 * 因为有些基础资源也是有合成任务的，而自动任务规划里就需要避开这些任务
 * 不然就会自动拆分出很多重复的任务，比如：发现需要能量 > 添加电池合成任务 > 添加能量合成任务 > ...
 */
export const inBlacklist = function (resType: ResourceConstant): boolean {
    return BLACK_LIST.includes(resType as MineralConstant) || !(resType in COMMODITIES)
}
