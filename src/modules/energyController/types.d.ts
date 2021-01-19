/**
 * 当前允许获取能量的目标
 * 建筑或地上的能量
 */
type EnergyTarget = EnergySourceStructure | Resource<RESOURCE_ENERGY>

/**
 * 能量对象搜索对象
 * 
 * 这个的作用是给外部模块更好的搜索体验
 * 因为地上的能量和建筑的对象结构不一样，所以外部模块在找目标时需要先判断是哪个类型，然后再写对应的代码
 * 这个对象用于抹平这两者的差异
 */
interface EnergyTargetFilterObj<Target extends EnergyTarget, Type extends string> {
    amount: number
    type: Type
    target: Target
}

/**
 * 所有的搜索对象
 */
type EnergyTargetFilterObjs =
    EnergyTargetFilterObj<EnergySourceStructure, StructureConstant> |
    EnergyTargetFilterObj<Resource<RESOURCE_ENERGY>, RESOURCE_ENERGY>

/**
 * 能量搜索方法
 * 外部模块提供的搜索方法都应符合这个标准
 */
type EnergyTargetFinder = (targets: EnergyTargetFilterObjs[]) => EnergyTargetFilterObjs
type EnergyTargetFilter = (targets: EnergyTargetFilterObjs[]) => EnergyTargetFilterObjs[]

interface Room {
    /**
     * 本 tick 房间内的可用能量源缓存
     */
    _energyFilterObj: EnergyTargetFilterObjs[]
}
