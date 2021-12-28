import { TerminalChannel, TerminalMode } from '../constants'
import { TerminalMemoryAccessor } from '../memory'
import { TerminalContext, TerminalListenTask } from '../types'
import { getExistOrder, getOrderPrice, searchOrder } from '../utils'

/**
 * terminal 的订单处理由本模块完成
 */
export const useTaskListener = function (context: TerminalContext, db: TerminalMemoryAccessor) {
    const { getMemory, env, hasTransportTask, addTransportTask, requestShare, onCanProvideResource } = context

    /**
     * 挂单
     *
     * @param resourceType 要拍单的资源类型
     * @param type 订单类型
     * @param amount 要购买的数量
     */
    const releaseOrder = function (resourceType: ResourceConstant, type: ORDER_BUY | ORDER_SELL, amount: number, room: Room) {
        // 检查是否已经有对应资源的订单
        const order = getExistOrder(room.name, resourceType, type)
        const { market } = env.getGame()

        // 存在就追加订单
        if (order) {
            // 价格有变化就更新价格
            const price = getOrderPrice(resourceType, type)
            if (price !== order.price) {
                const result = market.changeOrderPrice(order.id, getOrderPrice(resourceType, type))

                if (result === ERR_NOT_ENOUGH_RESOURCES) {
                    env.log.warning(`没有足够的 credit 来为 ${resourceType} ${type} 缴纳挂单费用`)
                    return db.updateIndexToNext()
                }
            }

            // 如果订单已经吃了一半了就扩容下数量
            if (order.remainingAmount / amount < 0.5) {
                const result = market.extendOrder(order.id, amount - order.remainingAmount)

                if (result === ERR_NOT_ENOUGH_RESOURCES) {
                    env.log.warning(`没有足够的 credit 来为 ${resourceType} ${type} 缴纳挂单费用`)
                }
            }
        }
        // 不存在就新建订单
        else {
            const result = market.createOrder({
                type,
                resourceType,
                price: getOrderPrice(resourceType, type),
                totalAmount: amount,
                roomName: room.name
            })

            if (result === ERR_NOT_ENOUGH_RESOURCES) {
                env.log.warning(`没有足够的 credit 来为 ${resourceType} ${type} 缴纳挂单费用`)
            }
            else if (result === ERR_FULL) {
                env.log.warning(`订单数超过上限，无法为 ${resourceType} ${type} 创建新订单`)
            }
        }

        // 无论成功与否都直接下一个，因为挂单之后就不需要自己操作了
        db.updateIndexToNext()
    }

    /**
     * 拍单
     *
     * @param resourceType 要拍单的资源类型
     * @param type 订单类型
     * @param amount 要购买的数量
     * @param priceLimit 价格限制
     */
    const takeOrder = function (
        resourceType: MarketResourceConstant,
        type: ORDER_BUY | ORDER_SELL,
        amount: number,
        room: Room,
        priceLimit: number = undefined
    ) {
        // 获取订单
        const targetOrder = searchOrder({ type, resourceType }, priceLimit)
        if (!targetOrder) return db.updateIndexToNext()

        const memory = getMemory(room)
        const { market } = env.getGame()

        // 订单合适，写入缓存并要路费
        memory.orderId = targetOrder.id as Id<Order>

        // 想要卖出的数量有可能比订单数量大，所以计算路费的时候要考虑到
        const cost = market.calcTransactionCost(Math.min(amount, targetOrder.amount), room.name, targetOrder.roomName)
        // 如果路费不够的话就问 sotrage 要
        if (room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) < cost) {
            if (hasTransportTask(room)) return
            addTransportTask(room, [{
                from: room.storage.id,
                to: room.terminal.id,
                resType: RESOURCE_ENERGY,
                amount
            }])
        }
    }

    /**
     * 资源监听
     * 检查资源是否符合用户给定的期望
     */
    const listenTask = function (resource: TerminalListenTask, room: Room): void {
        const resourceAmount = room.terminal.store[resource.type]

        // 资源移出监听，超过才进行移出（卖出或共享资源）
        if (resource.mod === TerminalMode.Put) {
            if (resourceAmount <= resource.amount) return db.updateIndexToNext()
        }
        // 资源获取监听，低于标准才进行获取
        else if (resource.mod === TerminalMode.Get) {
            if (resourceAmount >= resource.amount) return db.updateIndexToNext()
        }
        else {
            env.log.warning(`未知监听类型 ${resource.mod}`)
            return db.updateIndexToNext()
        }

        // 能通过上面的检查说明没有满足条件，根据交易策略来执行不同的逻辑
        // 需要挂单
        if (resource.channel === TerminalChannel.Release) {
            releaseOrder(
                resource.type,
                resource.mod === TerminalMode.Get ? ORDER_BUY : ORDER_SELL,
                Math.abs(resourceAmount - resource.amount),
                room
            )
        }
        // 需要拍单
        else if (resource.channel === TerminalChannel.Take) {
            takeOrder(
                resource.type,
                // 这里订单类型取反是因为如果我想**买入**一个订单，那我就要拍下一个**卖单**
                resource.mod === TerminalMode.Get ? ORDER_SELL : ORDER_BUY,
                Math.abs(resourceAmount - resource.amount),
                room,
                resource.priceLimit
            )
        }
        // 进行共享
        else if (resource.channel === TerminalChannel.Share) {
            if (resource.mod === TerminalMode.Get) {
                requestShare(room, resource.type, resource.amount - resourceAmount)
            }
            else {
                onCanProvideResource && onCanProvideResource(room, resource.type)
            }

            return db.updateIndexToNext()
        }
        // 找不到对应的渠道
        else {
            env.log.warning(`未知渠道 ${resource.channel}`)
            return db.updateIndexToNext()
        }
    }

    return listenTask
}
