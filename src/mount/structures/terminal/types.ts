import { TerminalChannel, TerminalMode } from "./constant"

declare global {
    interface StructureTerminal {
        addTask(resourceType: ResourceConstant, amount: number, mod?: TerminalMode, channel?: TerminalChannel, priceLimit?: number): void
        add(resourceType: ResourceConstant, amount: number, mod?: TerminalMode, channel?: TerminalChannel, priceLimit?: number): string
        removeByType(type: ResourceConstant, mod: TerminalMode, channel: TerminalChannel): void
        remove(index: number): string
        show(): string
        /**
         * 在所有启用 powerspawn 的房间内平衡 power
         */
        balancePower(): OK | ERR_NOT_ENOUGH_RESOURCES | ERR_NAME_EXISTS | ERR_NOT_FOUND
    }

    interface RoomMemory {
        /**
         * 终端内存
         */
        terminal?: TerminalMemory
    }
}

interface TerminalMemory {
    /**
     * 终端监听矿物列表
     * 数组中每一个字符串都代表了一个监听任务，形如 "0 0 power"
     * 第一位对应 TerminalModes，第二位对应 TerminalChannels，第三位对应资源类型
     */
    tasks: string[]
    /**
     * 房间内终端缓存的订单id
     */
    orderId?: Id<Order>
    /**
     * 当前终端要监听的资源索引
     */
    index: number
}

/**
 * 终端监听任务，详见 doc/终端设计案
 */
export interface TerminalListenTask {
    /**
     * 要监听的资源类型
     */
    type: ResourceConstant
    /**
     * 期望数量
     */
    amount: number
    /**
     * 监听类型
     */
    mod: TerminalMode
    /**
     * 物流渠道
     */
    channel: TerminalChannel
    /**
     * 价格限制
     */
    priceLimit?: number
}

/**
 * 交易的合理范围
 * 将以昨日该资源的交易范围为基准，上(MAX)下(MIN)浮动出一个区间，超过该区间的订单将被不会交易
 * 如果没有特别指定的话将以 default 指定的区间为基准
 */
export type DealRatios = {
    [resType in ResourceConstant | 'default']?: {
        /**
         * 卖单的最高价格比率
         */
        MAX: number,
        /**
         * 买单的最低价格比率
         */
        MIN: number
    }
}