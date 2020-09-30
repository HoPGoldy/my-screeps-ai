import { calcBodyPart } from './utils'

/**
 * 设置项
 * 本文件存放了项目中的内置常量，一般情况下不需要进行修改。
 */

/**
 * 快速生成 creep 身体部件配置项
 * 
 * @param bodySets 1 - 8 级时对应的身体部件配置
 */
const getBodyConfig = function(...bodySets: [ BodySet, BodySet, BodySet, BodySet, BodySet, BodySet, BodySet, BodySet]): BodyConfig {
    let config = { 300: [], 550: [], 800: [], 1300: [], 1800: [], 2300: [], 5600: [], 10000: [] }
    // 遍历空配置项，用传入的 bodySet 依次生成配置项
    Object.keys(config).map((level, index) => {
        config[level] = calcBodyPart(bodySets[index])
    })

    return config
}

/**
 * 不同角色在 1 - 8 级时对应的的身体部件配置
 * spawn 在孵化时会根据所处房间的可用能量自动调整身体部件
 */
export const bodyConfigs: BodyConfigs = {
    harvester: getBodyConfig(
        { [WORK]: 2, [CARRY]: 1, [MOVE]: 1 },
        { [WORK]: 4, [CARRY]: 1, [MOVE]: 2 },
        { [WORK]: 6, [CARRY]: 1, [MOVE]: 3 },
        { [WORK]: 8, [CARRY]: 1, [MOVE]: 4 },
        { [WORK]: 10, [CARRY]: 1, [MOVE]: 5 },
        { [WORK]: 12, [CARRY]: 1, [MOVE]: 6 },
        { [WORK]: 12, [CARRY]: 1, [MOVE]: 6 },
        { [WORK]: 12, [CARRY]: 1, [MOVE]: 6 }
    ),
    /**
     * 工作单位
     * 诸如 harvester、builder 之类的
     */
    worker: getBodyConfig(
        { [WORK]: 1, [CARRY]: 1, [MOVE]: 1 },
        { [WORK]: 2, [CARRY]: 2, [MOVE]: 2 },
        { [WORK]: 3, [CARRY]: 3, [MOVE]: 3 },
        { [WORK]: 4, [CARRY]: 4, [MOVE]: 4 },
        { [WORK]: 6, [CARRY]: 6, [MOVE]: 6 },
        { [WORK]: 7, [CARRY]: 7, [MOVE]: 7 },
        { [WORK]: 12, [CARRY]: 6, [MOVE]: 9 },
        { [WORK]: 20, [CARRY]: 8, [MOVE]: 14 }
    ),

    /**
     * 升级单位
     * 最大的身体部件只包含 12 个 WORK
     */
    upgrader: getBodyConfig(
        { [WORK]: 1, [CARRY]: 1, [MOVE]: 1 },
        { [WORK]: 2, [CARRY]: 2, [MOVE]: 2 },
        { [WORK]: 3, [CARRY]: 3, [MOVE]: 3 },
        { [WORK]: 4, [CARRY]: 4, [MOVE]: 4 },
        { [WORK]: 6, [CARRY]: 6, [MOVE]: 6 },
        { [WORK]: 9, [CARRY]: 9, [MOVE]: 9 },
        { [WORK]: 17, [CARRY]: 9, [MOVE]: 17 },
        { [WORK]: 12, [CARRY]: 12, [MOVE]: 12 }
    ),

    /**
     * 房间物流管理单位
     * 负责转移基地资源的 creep
     */
    manager: getBodyConfig(
        { [CARRY]: 2, [MOVE]: 1 },
        { [CARRY]: 3, [MOVE]: 2 },
        { [CARRY]: 4, [MOVE]: 2 },
        { [CARRY]: 5, [MOVE]: 3 },
        { [CARRY]: 8, [MOVE]: 4 },
        { [CARRY]: 14, [MOVE]: 7 },
        { [CARRY]: 20, [MOVE]: 10 },
        { [CARRY]: 32, [MOVE]: 16 }
    ),

    /**
     * 中央物流管理单位
     * 负责转移中央物流的 creep（下面其实前 4 级都用不到，因为中央物流管理员只会在 5 级有了 centerLink 之后才会孵化）
     */
    processor: getBodyConfig(
        { [CARRY]: 2, [MOVE]: 1 },
        { [CARRY]: 3, [MOVE]: 1 },
        { [CARRY]: 5, [MOVE]: 1 },
        { [CARRY]: 7, [MOVE]: 1 },
        { [CARRY]: 11, [MOVE]: 1 },
        { [CARRY]: 14, [MOVE]: 1 },
        { [CARRY]: 26, [MOVE]: 1 },
        { [CARRY]: 39, [MOVE]: 1 }
    ),

    /**
     * 外矿预定单位
     */
    reserver: getBodyConfig(
        { [MOVE]: 1, [CLAIM]: 1 },
        { [MOVE]: 1, [CLAIM]: 1 },
        { [MOVE]: 1, [CLAIM]: 1 },
        { [MOVE]: 1, [CLAIM]: 1 },
        { [MOVE]: 2, [CLAIM]: 2 },
        { [MOVE]: 2, [CLAIM]: 2 },
        { [MOVE]: 3, [CLAIM]: 3 },
        { [MOVE]: 5, [CLAIM]: 5 }
    ),

    /**
     * 基础攻击单位
     * 使用 attack 身体部件的攻击单位
     */
    attacker: getBodyConfig(
        { [MOVE]: 2, [ATTACK]: 2 },
        { [MOVE]: 3, [ATTACK]: 3 },
        { [MOVE]: 4, [ATTACK]: 4 },
        { [MOVE]: 5, [ATTACK]: 5 },
        { [MOVE]: 6, [ATTACK]: 6 },
        { [MOVE]: 7, [ATTACK]: 7 },
        { [MOVE]: 8, [ATTACK]: 8 },
        { [MOVE]: 9, [ATTACK]: 9 }
    ),

    /**
     * 基础治疗单位
     */
    healer: getBodyConfig(
        { [MOVE]: 1, [HEAL]: 1 },
        { [MOVE]: 1, [HEAL]: 1 },
        { [MOVE]: 2, [HEAL]: 2 },
        { [MOVE]: 4, [HEAL]: 4 },
        { [MOVE]: 6, [HEAL]: 6 },
        { [MOVE]: 7, [HEAL]: 7 },
        { [MOVE]: 16, [HEAL]: 16 },
        { [MOVE]: 25, [HEAL]: 25 }
    ), 

    /**
     * 拆除者身体
     */
    dismantler: getBodyConfig(
        { [WORK]: 1, [MOVE]: 2 },
        { [WORK]: 2, [MOVE]: 4 },
        { [WORK]: 4, [MOVE]: 4 },
        { [WORK]: 6, [MOVE]: 6 },
        { [WORK]: 10, [MOVE]: 10 },
        { [WORK]: 15, [MOVE]: 15 },
        { [WORK]: 25, [MOVE]: 25 },
        { [WORK]: 25, [MOVE]: 25 }
    ),

    /**
     * 外矿采集者
     * 和采集者的区别就是外矿采集者拥有更多的 CARRY
     */
    remoteHarvester: getBodyConfig(
        { [WORK]: 1, [CARRY]: 1, [MOVE]: 1 },
        { [WORK]: 2, [CARRY]: 2, [MOVE]: 2 },
        { [WORK]: 3, [CARRY]: 3, [MOVE]: 3 },
        { [WORK]: 4, [CARRY]: 6, [MOVE]: 5 },
        { [WORK]: 5, [CARRY]: 9, [MOVE]: 7 },
        { [WORK]: 6, [CARRY]: 10, [MOVE]: 8 },
        { [WORK]: 7, [CARRY]: 15, [MOVE]: 11 },
        { [WORK]: 11, [CARRY]: 15, [MOVE]: 19 }
    )
}

/**
 * 当前使用的基地布局信息
 * 描述了在不同等级时应该将不同建筑放置在何处（相对于基地中心点）
 * 值为 null 代表在集中式布局之外，会自动选择其放置点
 */
export const baseLayout: BaseLayout = {
    1: {
        [STRUCTURE_SPAWN]: [[-3,-2]]
    },
    2: {
        [STRUCTURE_EXTENSION]: [[-4,-3],[-3,-4],[-5,-4],[-5,-3],[-5,-2]]
    },
    3: {
        [STRUCTURE_EXTENSION]: [[-4,-5],[-3,-5],[-2,-5],[-1,-4],[-1,-3]],
        [STRUCTURE_TOWER]: [[-2,-1]],
        [STRUCTURE_ROAD]: [[-1,-2],[-1,-1],[-2,-2],[-3,-3],[-2,-4],[-4,-2],[-4,-4]]
    },
    4: {
        [STRUCTURE_EXTENSION]: [[-3,-1],[-4,-1],[1,-4],[1,-3],[3,-4],[4,-3],[2,-5],[3,-5],[4,-5],[5,-4]],
        [STRUCTURE_STORAGE]: [[0,-1]],
        [STRUCTURE_ROAD]: [[0,-3],[1,-2],[2,-2],[3,-3],[2,-4],[4,-4]],
        [STRUCTURE_RAMPART]: [[-3,-2],[0,-1],[-2,-1]]
    },
    5: {
        [STRUCTURE_EXTENSION]: [[5,-3],[5,-2],[4,-1],[3,-1],[-3,1],[-4,1],[-3,2],[-4,3],[-3,4],[-2,3]],
        [STRUCTURE_TOWER]: [[0,-2]],
        [STRUCTURE_LINK]: [[-1,0], null],
        [STRUCTURE_ROAD]: [[4,-2],[-2,0],[-1,1],[-1,2],[-2,2],[-3,3],[-4,2],[0,0]],
        [STRUCTURE_RAMPART]: [[0,-2]]
    },
    6: {
        [STRUCTURE_EXTENSION]: [[-5,2],[-5,3],[-5,4],[-4,5],[-3,5],[-2,5],[-1,3],[-1,4],[3,1],[4,1]],
        [STRUCTURE_LAB]: [[4,3],[3,4],[2,3]],
        [STRUCTURE_TERMINAL]: [[1,0]],
        [STRUCTURE_EXTRACTOR]: [null],
        [STRUCTURE_LINK]: [null],
        [STRUCTURE_ROAD]: [[1,-1],[2,0],[1,1],[1,2],[0,3],[3,0],[2,2],[3,3]],
        [STRUCTURE_RAMPART]: [[1,0]]
    },
    7: {
        [STRUCTURE_EXTENSION]: [[5,1],[5,-1],[5,-5],[1,-5],[-5,-5],[-5,-1],[-5,1],[-1,5],[-1,-5],[1,3]],
        [STRUCTURE_TOWER]: [[2,-1]],
        [STRUCTURE_SPAWN]: [[-2,-3]],
        [STRUCTURE_FACTORY]: [[0,1]],
        [STRUCTURE_LAB]: [[3,2],[2,4],[3,5]],
        [STRUCTURE_LINK]: [null],
        [STRUCTURE_ROAD]: [[4,4],[-4,4],[-2,4],[4,0],[-3,0],[-4,0]],
        [STRUCTURE_RAMPART]: [[0,1],[-2,-3],[2,-1]]
    },
    8: {
        [STRUCTURE_EXTENSION]: [[1,4],[1,5]],
        [STRUCTURE_TOWER]: [[-2,1],[0,2],[2,1]],
        [STRUCTURE_LAB]: [[5,2],[5,3],[5,4],[4,5]],
        [STRUCTURE_SPAWN]: [[2,-3]],
        [STRUCTURE_OBSERVER]: [[2,5]],
        [STRUCTURE_NUKER]: [[-5,5]],
        [STRUCTURE_POWER_SPAWN]: [[3,-2]],
        [STRUCTURE_ROAD]: [[4,2],[0,4],[0,-4]],
        [STRUCTURE_RAMPART]: [[2,-3],[-5,5],[-2,1],[0,2],[2,1]]
    }
}

// creep 的默认内存
export const creepDefaultMemory: CreepMemory = {
    role: 'harvester', 
    ready: false, 
    working: false
}

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
export const reactionSource: IReactionSource = {
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
 * factory 会优先保证底物的数量超过下面的限制之后才会进行生产
 * 例如：factory 想要生产 RESOURCE_OXIDANT，但是 RESOURCE_OXYGEN 的数量低于 FACTORY_LOCK_AMOUNT[RESOURCE_OXIDANT].limit 所以 factory 就会暂时停工
 */
export const FACTORY_LOCK_AMOUNT = {
    [RESOURCE_OXIDANT]: {
        sub: RESOURCE_OXYGEN,
        limit: 40000
    },
    [RESOURCE_REDUCTANT]: {
        sub: RESOURCE_HYDROGEN,
        limit: 40000
    },
    [RESOURCE_UTRIUM_BAR]: {
        sub: RESOURCE_UTRIUM,
        limit: 40000
    },
    [RESOURCE_LEMERGIUM_BAR]: {
        sub: RESOURCE_LEMERGIUM,
        limit: 40000
    },
    [RESOURCE_KEANIUM_BAR]: {
        sub: RESOURCE_KEANIUM,
        limit: 40000
    },
    [RESOURCE_ZYNTHIUM_BAR]: {
        sub: RESOURCE_ZYNTHIUM,
        limit: 40000
    },
    [RESOURCE_PURIFIER]: {
        sub: RESOURCE_CATALYST,
        limit: 40000
    },
    [RESOURCE_GHODIUM_MELT]: {
        sub: RESOURCE_GHODIUM,
        limit: 3000
    }
}

/**
 * powerProcess 的设置 
 */
export const powerSettings = {
    // 当前房间 storage 内存量低于limit时自动停止 process
    processEnergyLimit: 500000
}

/**
 * 此处定义了所有的房间物流任务类型
 * 每个房间物流的任务的 type 属性都必须是下列定义之一
 */
export const ROOM_TRANSFER_TASK = {
    // 基础运维
    FILL_EXTENSION: 'fillExtension',
    FILL_TOWER: 'fillTower',
    // nuker 填充
    FILL_NUKER: 'fillNuker',
    // lab 物流
    LAB_IN: 'labIn',
    LAB_OUT: 'labOut',
    LAB_GET_ENERGY: 'labGetEnergy',
    FILL_POWERSPAWN: 'fillPowerSpawn',
    // boost 物流
    BOOST_GET_RESOURCE: 'boostGetResource',
    BOOST_GET_ENERGY: 'boostGetEnergy',
    BOOST_CLEAR: 'boostClear'
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
 * 需要挂载内存的 structure
 * 
 * @property {} poto 要进行挂载的原型
 * @property {} memoryKey 其在所在房间内存中的存储字段
 */
export const structureWithMemory: {
    poto: StructureConstructor
    memoryKey: string
}[] = [ 
    {
        poto: StructureFactory,
        memoryKey: STRUCTURE_FACTORY
    }
]

/**
 * 工厂的不同阶段
 */
export const FACTORY_STATE = {
    PREPARE: 'prepare',
    GET_RESOURCE: 'getResource',
    WORKING: 'working',
    PUT_RESOURCE: 'putResource'
}

/**
 * factory 合成黑名单
 * 工厂在合成时不会将下属材料设置为任务目标
 * 因为工厂会自行分级大型任务，当出现互为底物的产品时，就会出现下面的循环问题：
 * 需要合成电池 > 检查发现需要能量 > 添加合成能量任务 > 检查原料发现需要电池 > 推送合成电池任务 > ...
 */
export const factoryBlacklist = [
    RESOURCE_ENERGY,
    RESOURCE_HYDROGEN,
    RESOURCE_OXYGEN,
    RESOURCE_UTRIUM,
    RESOURCE_KEANIUM,
    RESOURCE_LEMERGIUM,
    RESOURCE_ZYNTHIUM,
    RESOURCE_CATALYST,
    RESOURCE_GHODIUM
]

// 工厂在 storage 中能量低于该值时将暂停工作
export const factoryEnergyLimit = 300000

/**
 * 工厂不同沉积物 1-5 等级对应的顶级产物
 */
export const factoryTopTargets: {
    [resType: string]: ITopTargetConfig
} = {
    // 机械产业
    [RESOURCE_METAL]: {
        1: [ RESOURCE_COMPOSITE, RESOURCE_TUBE ],
        2: [ RESOURCE_FIXTURES ],
        3: [ RESOURCE_LIQUID, RESOURCE_FRAME ],
        4: [ RESOURCE_HYDRAULICS ],
        5: [ RESOURCE_MACHINE ]
    },
    // 生物产业
    [RESOURCE_BIOMASS]: {
        1: [ RESOURCE_PHLEGM ],
        2: [ RESOURCE_TISSUE ],
        3: [ RESOURCE_LIQUID, RESOURCE_MUSCLE ],
        4: [ RESOURCE_ORGANOID ],
        5: [ RESOURCE_ORGANISM ]
    },
    // 电子产业
    [RESOURCE_SILICON]: {
        1: [ RESOURCE_COMPOSITE, RESOURCE_SWITCH ],
        2: [ RESOURCE_CRYSTAL, RESOURCE_TRANSISTOR ],
        3: [ RESOURCE_MICROCHIP ],
        4: [ RESOURCE_CIRCUIT ],
        5: [ RESOURCE_DEVICE ]
    },
    // 奥秘产业
    [RESOURCE_MIST]: {
        1: [ RESOURCE_CONCENTRATE ],
        2: [ RESOURCE_CRYSTAL, RESOURCE_EXTRACT ],
        3: [ RESOURCE_SPIRIT ],
        4: [ RESOURCE_EMANATION ],
        5: [ RESOURCE_ESSENCE ]
    }
}

/**
 * 商品的最大生产数量
 * 为了避免低级工厂一直抢夺更低级工厂的资源导致高级工厂无法合成，引入该配置项（例如 3 级工厂一直吃 2 级商品，导致 4 级工厂停工）
 * 一旦工厂发现目标产物数量已经超过下面设置的上限，就会选择其他的顶级产物，未在该配置项中出现的资源将一直生产。
 * 只有上面 factoryTopTargets 中规定的商品才会受此约束
 */
export const commodityMax = {
    [RESOURCE_COMPOSITE]: 3000,
    [RESOURCE_LIQUID]: 1000,
    // metal
    [RESOURCE_TUBE]: 700,
    [RESOURCE_FIXTURES]: 500,
    [RESOURCE_FRAME]: 200,
    [RESOURCE_HYDRAULICS]: 50,
    // biomass
    [RESOURCE_PHLEGM]: 700,
    [RESOURCE_TISSUE]: 500,
    [RESOURCE_MUSCLE]: 200,
    [RESOURCE_ORGANOID]: 50,
    // silicon
    [RESOURCE_SWITCH]: 700,
    [RESOURCE_TRANSISTOR]: 500,
    [RESOURCE_MICROCHIP]: 200,
    [RESOURCE_CIRCUIT]: 50,
    // mist
    [RESOURCE_CONCENTRATE]: 700,
    [RESOURCE_EXTRACT]: 500,
    [RESOURCE_SPIRIT]: 200,
    [RESOURCE_EMANATION]: 50
}

/**
 * miner 的矿物采集上限
 * 当 terminal 中的资源多余这个值时，miner 将不再继续采矿
 */
export const minerHervesteLimit = 200000

/**
 * 交易时的购买区间限制
 * 用于防止过贵的卖单或者太便宜的买单
 * 在进行交易时会通过该资源的昨日历史价格配合下面的比例来确定合适的交易价格区间
 */
export const DEAL_RATIO: DealRatios = {
    default: { MAX: 1.4, MIN: 0.4 },
    // 所有原矿
    [RESOURCE_HYDROGEN]: { MAX: 2.5, MIN: 0.3 },
    [RESOURCE_OXYGEN]: { MAX: 2.5, MIN: 0.3 },
    [RESOURCE_UTRIUM]: { MAX: 2.5, MIN: 0.3 },
    [RESOURCE_LEMERGIUM]: { MAX: 2.5, MIN: 0.3 },
    [RESOURCE_KEANIUM]: { MAX: 2.5, MIN: 0.3 },
    [RESOURCE_ZYNTHIUM]: { MAX: 2.5, MIN: 0.3 },
    [RESOURCE_CATALYST]: { MAX: 2.5, MIN: 0.3 }
}

// 造好新墙时 builder 会先将墙刷到超过下面值，之后才会去建其他建筑
export const minWallHits = 8000

// pc 空闲时会搓 ops，下面是搓的上限
export const maxOps = 50000

// 终端支持的物流模式
export const terminalModes: {
    get: ModeGet
    put: ModePut
} = {
    // 获取资源
    get: 0,
    // 提供资源
    put: 1
}

// 终端支持的物流渠道
export const terminalChannels: {
    take: ChannelTake
    release: ChannelRelease
    share: ChannelShare
} = {
    // 拍单
    take: 0,
    // 挂单
    release: 1,
    // 资源共享
    share: 2
}

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
 * source container 离基地中心的距离与对应发布的 filler 数量
 * 这个值是每个 container 发布的 filler
 */
export const FILLER_WITH_CONTAINER_RANGE = [
    { range: 30, num: 3 },
    { range: 20, num: 2 },
    { range: 0, num: 1 }
]

// 用于维持房间能量正常运转的重要角色
export const importantRoles: CreepRoleConstant[] = [ 'harvester', 'collector', 'filler', 'manager', 'processor' ]

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