import { TopTargetConfig } from './types'

/**
 * 工厂的物流任务类型
 */
export enum FactoryTransportType {
    GetResource = 1,
    PutResource
}

/**
 * 工厂的不同阶段
 */
export enum FactoryState {
    Prepare = 'prepare',
    GetResource = 'getResource',
    Working = 'working',
    PutResource = 'putResource'
}

/**
 * 与外界交互
 */
export enum InteractAction {
    /**
     * 在全局资源共享中注销自己的提供
     */
    Unregister = 1,
    /**
     * 在全局资源共享中提供自己的商品
     */
    Register
}

/**
 * factory 合成黑名单
 * 工厂在合成时不会将下属材料设置为任务目标
 * 因为工厂会自行分级大型任务，当出现互为底物的产品时，就会出现下面的循环问题：
 * 需要合成电池 > 检查发现需要能量 > 添加合成能量任务 > 检查原料发现需要电池 > 推送合成电池任务 > ...
 */
export const BLACK_LIST = [
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
export const ENERGY_LIMIT = 300000

/**
 * 工厂不同沉积物 1-5 等级对应的顶级产物
 */
export const TOP_TARGET: {
    [resType: string]: TopTargetConfig
} = {
    // 机械产业
    [RESOURCE_METAL]: {
        1: [RESOURCE_COMPOSITE, RESOURCE_TUBE],
        2: [RESOURCE_FIXTURES],
        3: [RESOURCE_LIQUID, RESOURCE_FRAME],
        4: [RESOURCE_HYDRAULICS],
        5: [RESOURCE_MACHINE]
    },
    // 生物产业
    [RESOURCE_BIOMASS]: {
        1: [RESOURCE_PHLEGM],
        2: [RESOURCE_TISSUE],
        3: [RESOURCE_LIQUID, RESOURCE_MUSCLE],
        4: [RESOURCE_ORGANOID],
        5: [RESOURCE_ORGANISM]
    },
    // 电子产业
    [RESOURCE_SILICON]: {
        1: [RESOURCE_COMPOSITE, RESOURCE_SWITCH],
        2: [RESOURCE_CRYSTAL, RESOURCE_TRANSISTOR],
        3: [RESOURCE_MICROCHIP],
        4: [RESOURCE_CIRCUIT],
        5: [RESOURCE_DEVICE]
    },
    // 奥秘产业
    [RESOURCE_MIST]: {
        1: [RESOURCE_CONCENTRATE],
        2: [RESOURCE_CRYSTAL, RESOURCE_EXTRACT],
        3: [RESOURCE_SPIRIT],
        4: [RESOURCE_EMANATION],
        5: [RESOURCE_ESSENCE]
    }
}

/**
 * 商品的最大生产数量
 * 为了避免低级工厂一直抢夺更低级工厂的资源导致高级工厂无法合成，引入该配置项（例如 3 级工厂一直吃 2 级商品，导致 4 级工厂停工）
 * 一旦工厂发现目标产物数量已经超过下面设置的上限，就会选择其他的顶级产物，未在该配置项中出现的资源将一直生产。
 * 只有上面 factoryTopTargets 中规定的商品才会受此约束
 */
export const COMMODITY_MAX = {
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
 * factory 会优先保证底物的数量超过下面的限制之后才会进行生产
 * 避免工厂吃光了所有的资源导致其他模块无法工作
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
