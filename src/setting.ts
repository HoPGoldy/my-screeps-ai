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

// 从反应目标产物获取其底物的对应表
export const reactionSource: ReactionSource = {
    // 三级化合物
    [RESOURCE_CATALYZED_GHODIUM_ACID]: [ RESOURCE_GHODIUM_ACID, RESOURCE_CATALYST ], 
    [RESOURCE_CATALYZED_GHODIUM_ALKALIDE]: [ RESOURCE_GHODIUM_ALKALIDE, RESOURCE_CATALYST ], 
    [RESOURCE_CATALYZED_KEANIUM_ACID]: [ RESOURCE_KEANIUM_ACID, RESOURCE_CATALYST ], 
    [RESOURCE_CATALYZED_KEANIUM_ALKALIDE]: [ RESOURCE_KEANIUM_ALKALIDE, RESOURCE_CATALYST ], 
    [RESOURCE_CATALYZED_LEMERGIUM_ACID]: [ RESOURCE_LEMERGIUM_ACID, RESOURCE_CATALYST ], 
    [RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE]: [ RESOURCE_LEMERGIUM_ALKALIDE, RESOURCE_CATALYST ], 
    [RESOURCE_CATALYZED_UTRIUM_ACID]: [ RESOURCE_UTRIUM_ACID, RESOURCE_CATALYST ], 
    [RESOURCE_CATALYZED_UTRIUM_ALKALIDE]: [ RESOURCE_UTRIUM_ALKALIDE, RESOURCE_CATALYST ], 
    [RESOURCE_CATALYZED_ZYNTHIUM_ACID]: [ RESOURCE_ZYNTHIUM_ACID, RESOURCE_CATALYST ], 
    [RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE]: [ RESOURCE_ZYNTHIUM_ALKALIDE, RESOURCE_CATALYST ], 
    // 二级化合物
    [RESOURCE_GHODIUM_ACID]: [ RESOURCE_GHODIUM_HYDRIDE, RESOURCE_HYDROXIDE ], 
    [RESOURCE_GHODIUM_ALKALIDE]: [ RESOURCE_GHODIUM_OXIDE, RESOURCE_HYDROXIDE ], 
    [RESOURCE_KEANIUM_ACID]: [ RESOURCE_KEANIUM_HYDRIDE, RESOURCE_HYDROXIDE], 
    [RESOURCE_KEANIUM_ALKALIDE]: [ RESOURCE_KEANIUM_OXIDE, RESOURCE_HYDROXIDE], 
    [RESOURCE_LEMERGIUM_ACID]: [ RESOURCE_LEMERGIUM_HYDRIDE, RESOURCE_HYDROXIDE], 
    [RESOURCE_LEMERGIUM_ALKALIDE]: [ RESOURCE_LEMERGIUM_OXIDE, RESOURCE_HYDROXIDE], 
    [RESOURCE_UTRIUM_ACID]: [ RESOURCE_UTRIUM_HYDRIDE, RESOURCE_HYDROXIDE], 
    [RESOURCE_UTRIUM_ALKALIDE]: [ RESOURCE_UTRIUM_OXIDE, RESOURCE_HYDROXIDE], 
    [RESOURCE_ZYNTHIUM_ACID]: [ RESOURCE_ZYNTHIUM_HYDRIDE, RESOURCE_HYDROXIDE], 
    [RESOURCE_ZYNTHIUM_ALKALIDE]: [ RESOURCE_ZYNTHIUM_OXIDE, RESOURCE_HYDROXIDE], 
    // 一级化合物
    [RESOURCE_GHODIUM_HYDRIDE]: [ RESOURCE_GHODIUM, RESOURCE_HYDROGEN ], 
    [RESOURCE_GHODIUM_OXIDE]: [ RESOURCE_GHODIUM, RESOURCE_OXYGEN ], 
    [RESOURCE_KEANIUM_HYDRIDE]: [ RESOURCE_KEANIUM, RESOURCE_HYDROGEN ], 
    [RESOURCE_KEANIUM_OXIDE]: [ RESOURCE_KEANIUM, RESOURCE_OXYGEN ], 
    [RESOURCE_LEMERGIUM_HYDRIDE]: [ RESOURCE_LEMERGIUM, RESOURCE_HYDROGEN ], 
    [RESOURCE_LEMERGIUM_OXIDE]: [ RESOURCE_LEMERGIUM, RESOURCE_OXYGEN ], 
    [RESOURCE_UTRIUM_HYDRIDE]: [ RESOURCE_UTRIUM, RESOURCE_HYDROGEN ], 
    [RESOURCE_UTRIUM_OXIDE]: [ RESOURCE_UTRIUM, RESOURCE_OXYGEN ], 
    [RESOURCE_ZYNTHIUM_HYDRIDE]: [ RESOURCE_ZYNTHIUM, RESOURCE_HYDROGEN ], 
    [RESOURCE_ZYNTHIUM_OXIDE]: [ RESOURCE_ZYNTHIUM, RESOURCE_OXYGEN ], 
    [RESOURCE_GHODIUM]: [ RESOURCE_ZYNTHIUM_KEANITE, RESOURCE_UTRIUM_LEMERGITE ], 
    // 基础化合物
    [RESOURCE_ZYNTHIUM_KEANITE]: [ RESOURCE_ZYNTHIUM, RESOURCE_KEANIUM ], 
    [RESOURCE_UTRIUM_LEMERGITE]: [ RESOURCE_UTRIUM, RESOURCE_LEMERGIUM ], 
    [RESOURCE_HYDROXIDE]: [ RESOURCE_HYDROGEN, RESOURCE_OXYGEN ], 
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
 * lab 集群的工作状态常量
 */
export const LAB_STATE = {
    GET_TARGET: 'getTarget', 
    GET_RESOURCE: 'getResource', 
    WORKING: 'working', 
    PUT_RESOURCE: 'putResource', 
    BOOST: 'boost'
}

/**
 * lab 集群的目标产物及其数量列表
 * 更新此表后所有工作中的 lab 集群都会自动合成新增的产物
 * @warning 请保证该化合物的底物存在于 terminal 中
 */
export const labTarget = [
    // 基础
    { target: RESOURCE_HYDROXIDE, number: 500 }, 
    { target: RESOURCE_ZYNTHIUM_KEANITE, number: 500 }, 
    { target: RESOURCE_UTRIUM_LEMERGITE, number: 500 }, 
    // G
    { target: RESOURCE_GHODIUM, number: 5000 }, 
    // XKHO2 生产线，强化 RANGE_ATTACK
    { target: RESOURCE_KEANIUM_OXIDE, number: 300 }, 
    { target: RESOURCE_KEANIUM_ALKALIDE, number: 1000 }, 
    { target: RESOURCE_CATALYZED_KEANIUM_ALKALIDE, number: 4000 }, 
    // XLHO2 生产线，强化 HEAL
    { target: RESOURCE_LEMERGIUM_OXIDE, number: 300 }, 
    { target: RESOURCE_LEMERGIUM_ALKALIDE, number: 1000 }, 
    { target: RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE, number: 4000 }, 
    // XZHO2 生产线，强化 MOVE
    { target: RESOURCE_ZYNTHIUM_OXIDE, number: 300 }, 
    { target: RESOURCE_ZYNTHIUM_ALKALIDE, number: 1000 }, 
    { target: RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, number: 4000 }, 
    // XZH2O 生产线，强化 WORK 的 dismantle
    { target: RESOURCE_ZYNTHIUM_HYDRIDE, number: 300 }, 
    { target: RESOURCE_ZYNTHIUM_ACID, number: 1000 }, 
    { target: RESOURCE_CATALYZED_ZYNTHIUM_ACID, number: 4000 }, 
    // XGHO2 生产线，强化 TOUGH
    { target: RESOURCE_GHODIUM_OXIDE, number: 300 }, 
    { target: RESOURCE_GHODIUM_ALKALIDE, number: 1000 }, 
    { target: RESOURCE_CATALYZED_GHODIUM_ALKALIDE, number: 4000 }, 
    // XGH20 生产线，强化 controller 升级
    { target: RESOURCE_GHODIUM_HYDRIDE, number: 1000 }, 
    { target: RESOURCE_GHODIUM_ACID, number: 1000 }, 
    { target: RESOURCE_CATALYZED_GHODIUM_ACID, number: 3000 }, 
]

/**
 * deposit 最大的采集冷却时长
 * 超过该时长则不会再进行挖掘
 */
export const DEPOSIT_MAX_COOLDOWN = 100

/**
 * observer 房间扫描间隔
 */
export const observerInterval = 10

/**
 * powerProcess 的设置 
 */
export const powerSettings = {
    // 当前房间 storage 内存量低于limit时自动停止 process
    processEnergyLimit: 500000
}

/**
 * 战争 boost 需要的所有强化材料，在启动战争状态后，manager 会依次将下列资源填充至 lab
 * 注意：在强化旗帜旁的 lab 数量需要超过下面的资源数量
 */
export const BOOST_RESOURCE: BoostResourceConfig = {
    // 对外战争所需的资源
    WAR: [
        // DISMANTLE
        RESOURCE_CATALYZED_ZYNTHIUM_ACID,
        // RANGED_ATTACK
        RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
        // HEAL
        RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
        // MOVE
        RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
        // TOUGH
        RESOURCE_CATALYZED_GHODIUM_ALKALIDE
    ],
    // 主动防御所需资源
    DEFENSE: [
        // ATTACK
        RESOURCE_CATALYZED_UTRIUM_ACID,
        // TOUGH
        RESOURCE_CATALYZED_GHODIUM_ALKALIDE,
        // MOVE
        RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE
    ]
}

/**
 * 当 lab 强化过 creep 之后会检查资源的剩余容量，如果低于下面这个值就会重新装填
 */
export const boostResourceReloadLimit = 900

/**
 * powerbank 的采集阶段
 * @property {} ATTACK 正在拆除
 * @property {} PREPARE 快拆完了，carrier 准备过来
 * @property {} TRANSFE 拆除完成，正在搬运
 */
export const PB_HARVESTE_STATE = {
    ATTACK: 'attack',
    PREPARE: 'prepare',
    TRANSFER: 'transfer'
}

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

// 房间 storage 中的数量超过下面值时
// 该房间就会将自己注册为能量共享的提供房间
export const ENERGY_SHARE_LIMIT = 600000

/**
 * miner 的矿物采集上限
 * 当 terminal 中的资源多余这个值时，miner 将不再继续采矿
 */
export const MINE_LIMIT = 200000

// 造好新墙时 builder 会先将墙刷到超过下面值，之后才会去建其他建筑
export const minWallHits = 8000

// pc 空闲时会搓 ops，下面是搓的上限
export const maxOps = 50000

// 每个房间最多同时存在多少 upgrader 和 harvester
export const MAX_UPGRADER_NUM = 8
export const MAX_HARVESTER_NUM = 4

/**
 * terminal 中能量和对应发布的 upgrader 数量
 * upgrader 自动发布时会优先使用 terminal 中的能量，不满足下表 [0] 的能量标准时才会去使用 storage 里的能量
 * 请确保最少有一条内容
 */
export const UPGRADE_WITH_TERMINAL = [
    { energy: 60000, num: 6 },
    { energy: 50000, num: 5 },
    { energy: 40000, num: 4 },
    { energy: 30000, num: 3 },
    { energy: 20000, num: 2 }
]

/**
 * storage 中的能量和对应发布的 upgrader 数量
 */
export const UPGRADE_WITH_STORAGE = [
    { energy: 700000, num: 3 },
    { energy: 500000, num: 2 },
    { energy: 100000, num: 1 }
]

/**
 * 8级时只要 cpu 足够，依旧会孵化一个 upgrader 进行升级
 * 这个限制代表了在房间 8 级时 storage 里的能量大于多少才会持续孵化 upgarder
 */
export const UPGRADER_WITH_ENERGY_LEVEL_8 = 700000

/**
 * source container 离基地中心的距离与对应发布的 filler 数量
 * 这个值是每个 container 发布的 filler
 */
export const FILLER_WITH_CONTAINER_RANGE = [
    { range: 25, num: 2 },
    { range: 0, num: 1 }
]

/**
 * 所有的 shard 名称，用于跨 shard 通讯，
 * 当增加了新 shard 时需要在该数组中添加其名称后才会启用和新 shard 的通讯
 */
export const ALL_SHARD_NAME: ShardName[] = [ 'shard0', 'shard1', 'shard2', 'shard3' ]

// 在执行了第一次移除操作之后，玩家需要在多少 tick 内重新执行移除操作才能真正发起移除请求
export const ROOM_REMOVE_INTERVAL: number = 30

// 每个 observer 同时允许采集的 pb 和 depo 的最大数量
export const OBSERVER_POWERBANK_MAX = 1
export const OBSERVER_DEPOSIT_MAX = 2

// tower 将在几级之后参与刷墙
export const TOWER_FILL_WALL_LEVEL = 6

/**
 * RCL 分别在几级时放置外墙
 * 例如 [ 3, 7, 8 ] 代表分别在第 3、7、8 级时放置第 1（最外层）、2、3 层 rampart
 */
export const LEVEL_BUILD_RAMPART = [ 4, 8, 8 ]

// RCL 几级的时候开始放置通向 [ source, controller, mineral ] 的道路
// 注意这个顺序要和 src\modules\autoPlanning\planRoad.ts 的默认方法返回值保持一致
export const LEVEL_BUILD_ROAD = [ 3, 4, 6 ]

/**
 * storage 填充到其他建筑的能量填充设置的下限默认值
 */
export const DEFAULT_ENERGY_KEEP_LIMIT = 900000

/**
 * storage 填充到其他建筑的能量填充设置的填充量默认值
 */
export const DEFAULT_ENERGY_KEEP_AMOUNT = 50000

/**
 * source 采集单位的行为模式
 */
export const HARVEST_MODE: {
    START: HarvestModeStart,
    SIMPLE: HarvestModeSimple,
    TRANSPORT: HarvestModeTransport
} = {
    START: 1,
    SIMPLE: 2,
    TRANSPORT: 3
}