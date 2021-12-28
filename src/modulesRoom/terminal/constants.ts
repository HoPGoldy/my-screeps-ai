import { DealRatios } from './types'

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

/**
 * 终端支持的物流模式
 */
export enum TerminalMode {
    /** 获取资源 */
    Get = 1,
    /** 提供资源 */
    Put
}

/**
 * 终端支持的物流渠道
 */
export enum TerminalChannel {
    /** 拍单 */
    Take = 1,
    /** 挂单 */
    Release,
    /** 共享 */
    Share
}

/**
 * 当 terminal 决定扔掉一些资源时，会从下面这些资源里挑一个储量最高的
 */
export const DROP_TARGET = [
    RESOURCE_ENERGY, RESOURCE_HYDROGEN, RESOURCE_OXYGEN,
    RESOURCE_UTRIUM, RESOURCE_ZYNTHIUM, RESOURCE_KEANIUM, RESOURCE_LEMERGIUM,
    RESOURCE_CATALYST
]

/**
 * 资源的最大丢弃数量
 */
export const MAX_DROP_AMOUNT = 5000
