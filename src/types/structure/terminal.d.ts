interface StructureTerminal {
    addTask(resourceType: ResourceConstant, amount: number, mod?: TerminalModes, channel?: TerminalChannels, priceLimit?: number): void
    add(resourceType: ResourceConstant, amount: number, mod?: TerminalModes, channel?: TerminalChannels, priceLimit?: number): string
    removeByType(type: ResourceConstant, mod: TerminalModes, channel: TerminalChannels): void
    remove(index: number): string
    show(): string
}

/**
 * 终端监听规则类型
 * 具体值详见 ./setting.ts > terminalModes
 */
type ModeGet = 0
type ModePut = 1
type TerminalModes = ModeGet | ModePut

/**
 * 终端监听规则的资源渠道
 * 具体值详见 ./setting.ts > terminalChannels
 */
type ChannelTake = 0
type ChannelRelease = 1
type ChannelShare = 2
type ChannelSupport = 3
type TerminalChannels = ChannelTake | ChannelRelease | ChannelShare | ChannelSupport

/**
 * 终端监听任务，详见 doc/终端设计案
 */
interface TerminalListenerTask {
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
    mod: TerminalModes
    /**
     * 渠道: market, share
     */
    channel: TerminalChannels
    /**
     * 价格限制
     */
    priceLimit?: number
    /**
     * 要支援的房间名
     */
    supportRoomName?: string
}

/**
 * 交易的合理范围
 * 将以昨日该资源的交易范围为基准，上(MAX)下(MIN)浮动出一个区间，超过该区间的订单将被不会交易
 * 如果没有特别指定的话将以 default 指定的区间为基准
 */
type DealRatios = {
    [resType in ResourceConstant | 'default']?: {
        /**
         * 卖单的最高价格
         */
        MAX: number,
        /**
         * 买单的最低价格
         */
        MIN: number
    }
}