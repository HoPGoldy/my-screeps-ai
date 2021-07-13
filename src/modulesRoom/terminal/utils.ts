import { Color } from "@/modulesGlobal"
import { DEAL_RATIO, TerminalChannel, TerminalMode } from "./constant"
import { TerminalListenTask } from "./types"

/**
 * 检查订单单价是否合适
 * 防止投机玩家的过低或过高订单
 * 
 * @param targetOrder 目标订单
 */
export const checkPrice = function (targetOrder: Order): boolean {
    const history = Game.market.getHistory(<ResourceConstant>targetOrder.resourceType)
    // 没有历史记录的话直接运行购买
    if (history.length <= 0) return true
    // 以昨日均价为准
    const avgPrice = history[0].avgPrice

    // 获取设置好的价格区间
    const dealRatio = targetOrder.resourceType in DEAL_RATIO ? DEAL_RATIO[targetOrder.resourceType] : DEAL_RATIO.default
    // 目标订单的价格要在规定好的价格区间内浮动才算可靠
    // 卖单的价格不能太高
    if (targetOrder.type == ORDER_SELL) {
        if (targetOrder.price <= avgPrice * dealRatio.MAX) return true
    }
    // 买单的价格不能太低
    else {
        if (targetOrder.price >= avgPrice * dealRatio.MIN) return true
    }
    return false
}

/**
 * 全局缓存的订单价格表
 * 键为资源和订单类型，如："energy/buy"、"power/sell"，值是缓存下来的订单价格
 */
const resourcePrice = {}

/**
 * 获取指定资源的订单价格
 * 
 * @param resourceType 资源类型
 * @param type 买单还是买单
 */
export const getOrderPrice = function (resourceType: ResourceConstant, type: ORDER_BUY | ORDER_SELL): number | undefined {
    // 先查看缓存
    const cachePrice = resourcePrice[`${resourceType}/${type}`]
    if (cachePrice) return cachePrice

    let price = undefined
    // 卖单用市场均价
    if (type === ORDER_SELL) {
        const history = Game.market.getHistory(resourceType)
        if (history.length <= 0) this.log(`无法为 ${resourceType} ${type} 创建订单，未找到历史交易记录`, Color.Yellow, true)
        else price = history[0].avgPrice
    }
    // 买单挂最高
    else {
        // 拉取市场订单作为参考
        const orders = Game.market.getAllOrders({ resourceType, type })
        // 降序排列，价高在前，方便下面遍历
        const sortedOrders = _.sortBy(orders, order => -order.price)
        // 找到价格合理的订单中售价最高的
        const targetOrder = sortedOrders.find(order => checkPrice(order))

        price = targetOrder ? targetOrder.price : undefined
    }

    // 存入缓存并返回
    resourcePrice[`${resourceType}/${type}`] = price
    return price
}

/**
 * 在已有的订单中检查是否有相同类型的订单
 * 
 * @param roomName 要搜索哪个房间的订单
 * @param resourceType 要搜索的资源类型
 * @param type 订单类型
 * @returns 找到的订单
 */
export const getExistOrder = function (roomName: string, resourceType: MarketResourceConstant, type: ORDER_BUY | ORDER_SELL): Order | undefined {
    // 遍历所有自己的订单进行检查
    for (const orderId in Game.market.orders) {
        const order = Game.market.orders[orderId]

        if (
            order.resourceType === resourceType && 
            order.type === type &&
            order.roomName === roomName
        ) return order
    }

    return undefined
}

/**
* 在市场里寻找合适的订单
* 
* @param config 市场交易任务
* @returns 找到则返回订单, 否找返回 null
*/
export const searchOrder = function (filter: OrderFilter, priceLimit: number = undefined): Order | null {
   const orders = Game.market.getAllOrders(filter)
   // 没找到订单就返回空
   if (orders.length <= 0) return null

   // price 升序找到最适合的订单
   // 买入找 price 最低的 卖出找 price 最高的
   const sortedOrders = _.sortBy(orders, order => order.price)
   const targetOrder = sortedOrders[filter.type === ORDER_SELL ? 0 : (sortedOrders.length - 1)]

   // 最后进行均价检查，如果玩家指定了限制的话就用，否则就看历史平均价格
   if (priceLimit) {
       // 卖单的价格不能太高
       if (targetOrder.type == ORDER_SELL) return targetOrder.price <= priceLimit ? targetOrder : null
       // 买单的价格不能太低
       else return targetOrder.price >= priceLimit ? targetOrder : null
   }
   else if (!checkPrice(targetOrder)) return null
   else return targetOrder
}

/**
 * @danger 注意，下面三个方法都涉及到了任务到字符串的解析与反解析，如果要进行修改的话需要同时对下面三个任务都进行修改
 * stringifyTask unstringifyTask isTaskMatched
 */

/**
 * 将任务序列化成字符串
 * 
 * @danger 注意，这个序列化格式是固定的，单独修改将会导致任务读取时出现问题
 * @param task 要序列化的任务
 */
export const stringifyTask = function ({ mod, channel, type, amount, priceLimit }: TerminalListenTask): string {
    return `${mod} ${channel} ${type} ${amount} ${priceLimit}`
}

/**
 * 把字符串解析为任务
 * 
 * @danger 注意，这个序列化格式是固定的，单独修改将会导致无法读取已保存任务
 * @param taskStr 要反序列化的任务
 */
export const unstringifyTask = function (taskStr: string): TerminalListenTask {
    // 对序列化的任务进行重建
    const [ mod, channel, type, amount, priceLimit ] = taskStr.split(' ')

    return {
        mod: (Number(mod) as TerminalMode),
        channel: (Number(channel) as TerminalChannel),
        type: (type as ResourceConstant),
        amount: Number(amount),
        priceLimit: priceLimit ? Number(priceLimit) : undefined
    }
}

/**
 * 判断 taskStr 任务字符串是否符合后三个属性
 * 
 * @param taskStr 要匹配的任务字符串
 * @param type 资源类型
 * @param mod 任务类型
 * @param channel 物流渠道
 */
export const isTaskMatched = function (
    taskStr: string,
    type: ResourceConstant,
    mod: TerminalMode,
    channel: TerminalChannel
): boolean {
    const matchKey = `${mod} ${channel} ${type}`
    return taskStr.includes(matchKey)
}