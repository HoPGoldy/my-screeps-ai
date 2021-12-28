import { EnvContext } from '@/utils'
import { TransportRequest } from '../taskTransport/types'
import { TerminalChannel, TerminalMode } from './constants'

export interface TerminalMemory {
    /**
     * 终端监听矿物列表
     * 数组中每一个字符串都代表了一个监听任务，形如 "0 0 power"
     * 第一位对应 TerminalModes，第二位对应 TerminalChannels，第三位对应资源类型
     */
    tasks?: string[]
    /**
     * 房间内终端缓存的订单id
     */
    orderId?: Id<Order>
    /**
     * 当前终端要监听的资源索引
     */
    index?: number
}

export type TerminalContext = {
    /**
     * 获取内存对象
     */
    getMemory: (room: Room) => TerminalMemory
    /**
     * 指定房间需要执行资源平衡
     * 若不传则会将多余的资源扔地上
     */
    balanceResource?: (room: Room) => unknown
    /**
     * 当前是否存在 tower 填充任务
     */
    hasTransportTask: (room: Room) => boolean
    /**
     * 新增 tower 填充任务
     */
    addTransportTask: (room: Room, requests: TransportRequest[]) => unknown
    /**
     * 返回是否存在共享任务
     */
    hasShareTask: (room: Room) => boolean
    /**
     * 执行共享任务
     * 当 hasShareTask 返回 true 时，terminal 将会执行本方法并不再进行其他动作
     */
    execShareTask: (terminal: StructureTerminal) => unknown
    /**
     * 添加共享任务
     * 接入资源共享模块
     *
     * @param sourceRoom 发送房间
     * @param targetRoom 接受房间
     * @param resType 发送资源类型
     * @param amount 共享数量
     */
    addShareTask: (sourceRoom: Room, targetRoom: Room, resType: ResourceConstant, amount: number) => unknown
    /**
     * 请求外界提供资源
     * 调用本方法后其他房间应向本房间发送对应的资源
     *
     * @param room 发起请求的房间
     * @param resType 请求的资源类型
     * @param amount 请求的数量
     */
    requestShare: (room: Room, resType: ResourceConstant, amount: number) => unknown
    /**
     * 当房间可以提供某种资源共享给其他房间时调用
     */
    onCanProvideResource?: (provideRoom: Room, resType: ResourceConstant) => unknown
    /**
     * 获取房间中的 mineral
     */
    getMineral: (room: Room) => Mineral
    /**
     * 获取房间中某个资源储量
     */
    getResource: (room: Room, resType: ResourceConstant) => number
    /**
     * 收集 terminal 状态
     */
    scanState?: (terminal: StructureTerminal) => unknown
} & EnvContext

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

/**
 * 终端监听任务
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
