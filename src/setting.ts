/**
 * 设置项
 * 本文件存放了项目中的内置常量，一般情况下不需要进行修改。
 */

// 房间建筑维修需要的设置
export const repairSetting = {
    // 在 tower 的能量高于该值时才会刷墙
    energyLimit: 600,
    // 普通建筑维修的检查间隔
    checkInterval: 8,
    // 墙壁维修的检查间隔
    wallCheckInterval: 3,
    // 墙壁的关注时间
    focusTime: 100
}

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
 * 当前房间 storage 内存量低于该值时将停止 process
 */
export const POWER_PROCESS_ENERGY_LIMIT = 500000

/**
 * 默认的旗帜名称
 */
export const DEFAULT_FLAG_NAME = {
    // 进攻
    ATTACK: 'attack',
    // 占领
    CLAIM: 'claim',
    // 待命
    STANDBY: 'standBy',
    // 掠夺
    REIVER: 'reiver'
}

/**
 * miner 的矿物采集上限
 * 当房间中的对应矿物资源多于这个值时，miner 将不再继续采矿
 */
export const MINE_LIMIT = 100000

// 造好新墙时 builder 会先将墙刷到超过下面值，之后才会去建其他建筑
export const MIN_WALL_HITS = 8000

/**
 * 8级时只要 cpu 足够，依旧会孵化一个 upgrader 进行升级
 * 这个限制代表了在房间 8 级时 storage 里的能量大于多少才会持续孵化 upgarder
 */
export const UPGRADER_WITH_ENERGY_LEVEL_8 = 700000

/**
 * 所有的 shard 名称，用于跨 shard 通讯，
 * 当增加了新 shard 时需要在该数组中添加其名称后才会启用和新 shard 的通讯
 */
export const ALL_SHARD_NAME: ShardName[] = ['shard0', 'shard1', 'shard2', 'shard3']

// 在执行了第一次移除操作之后，玩家需要在多少 tick 内重新执行移除操作才能真正发起移除请求
export const ROOM_REMOVE_INTERVAL: number = 30

/**
 * RCL 分别在几级时放置外墙
 * 例如 [ 3, 7, 8 ] 代表分别在第 3、7、8 级时放置第 1（最外层）、2、3 层 rampart
 */
export const LEVEL_BUILD_RAMPART = [4, 8, 8]

// RCL 几级的时候开始放置通向 [ source, controller, mineral ] 的道路
// 注意这个顺序要和 src\modules\autoPlanning\planRoad.ts 的默认方法返回值保持一致
export const LEVEL_BUILD_ROAD = [3, 4, 6]
