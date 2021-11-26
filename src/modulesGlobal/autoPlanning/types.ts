/**
 * 基地布局信息
 */
export type BaseLayout = {
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
export type AutoPlanResult = {
    // 该类型建筑应该被放置在什么地方
    [structureType in BuildableStructureConstant]?: RoomPosition[] | null
}

declare global {
    interface Memory {
        /**
         * 在模拟器中调试布局时才会使用到该字段，在正式服务器中不会用到该字段
         */
        layoutInfo?: BaseLayout
        /**
         * 用于标记布局获取到了哪一等级
         */
        layoutLevel?: number
    }
}
