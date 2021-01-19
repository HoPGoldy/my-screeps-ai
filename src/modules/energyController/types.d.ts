/**
 * 当前允许获取能量的目标
 * 建筑或地上的能量
 */
type EnergyTarget = EnergySourceStructure | Resource<RESOURCE_ENERGY>

/**
 * 能量搜索方法
 * 外部模块提供的搜索方法都应符合这个标准
 */
type EnergyTargetFinder = (targets: EnergyTarget[]) => EnergyTarget
type EnergyTargetFilter = (targets: EnergyTarget[]) => EnergyTarget[]

interface Room {
    /**
     * 本 tick 房间内的可用能量源缓存
     */
    _energyFilterObj: EnergyTarget[]
}
