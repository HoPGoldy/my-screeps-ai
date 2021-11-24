/**
 * 所有的基础元素矿
 */
export const BASE_MINERAL = [
    RESOURCE_OXYGEN,
    RESOURCE_HYDROGEN,
    RESOURCE_KEANIUM,
    RESOURCE_LEMERGIUM,
    RESOURCE_UTRIUM,
    RESOURCE_ZYNTHIUM,
    RESOURCE_CATALYST
]

/**
 * 所有的 shard 名称，用于跨 shard 通讯，
 * 当增加了新 shard 时需要在该数组中添加其名称后才会启用和新 shard 的通讯
 */
export const ALL_SHARD_NAME: ShardName[] = ['shard0', 'shard1', 'shard2', 'shard3']

/**
 * 默认的旗帜名称
 */
export const DEFAULT_FLAG_NAME = {
    // 掠夺
    REIVER: 'reiver'
}
