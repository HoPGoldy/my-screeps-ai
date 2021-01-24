/**
 * 基地布局信息
 */
type BaseLayout = {
    /**
     * 该类型建筑应该被放置在什么地方
     */
    [structureType in StructureConstant]?: [ number, number ][] | null
}[]

/**
 * 建筑规划结果
 * 
 * 每种建筑（键）都对应一个建筑位置二维数组（值）
 * 后面的二维数组第一层代表 RCL 等级，第二层包含了该 RCL 时应该建造的位置信息
 */
type StructurePlanningResult = {
    // 该类型建筑应该被放置在什么地方
    [structureType in BuildableStructureConstant]?: RoomPosition[] | null
}[]

/**
 * 全局建筑规划缓存
 * 键为房间名，值为对应的规划结果
 */
interface StructurePlanningCache {
    [roomName: string]: StructurePlanningResult
}

/**
 * 目前存在的所有有效 RCL 等级
 */
type AvailableLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

interface Memory {
    /**
     * 在模拟器中调试布局时才会使用到该字段，在正式服务器中不会用到该字段
     */
    layoutInfo?: BaseLayout
    /**
     * 用于标记布局获取到了那一等级
     */
    layoutLevel?: AvailableLevel
}