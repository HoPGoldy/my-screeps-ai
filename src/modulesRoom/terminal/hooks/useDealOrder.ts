import { TerminalMemoryAccessor } from '../memory'
import { TerminalContext, TerminalListenTask } from '../types'

/**
 * terminal 的订单处理由本模块完成
 */
export const useDealOrder = function (context: TerminalContext, db: TerminalMemoryAccessor) {
    const { getMemory, env, hasTransportTask, addTransportTask } = context

    /**
     * 能量检查
     * 如果 terminal 中能量过多会返还至 storage
     */
    const energyCheck = function (terminal: StructureTerminal): void {
        if (terminal.store[RESOURCE_ENERGY] < 30000) return
        addTransportTask(terminal.room, [{
            from: terminal.id,
            to: terminal.room.storage.id,
            resType: RESOURCE_ENERGY,
            amount: terminal.store[RESOURCE_ENERGY] - 1000
        }])
    }

    /**
     * 继续处理之前缓存的订单
     *
     * @param resource 要处理的任务
     * @param room 所在的房间
     * @returns 是否有空闲精力继续工作
     */
    const dealOrder = function (resource: TerminalListenTask, room: Room): boolean {
        const memory = getMemory(room)
        const { market } = env.getGame()

        // 没有订单需要处理
        if (!memory.orderId) return true
        // 获取订单
        const targetOrder = market.getOrderById(memory.orderId)
        // 订单无效则移除缓存并继续检查
        if (!targetOrder) {
            delete memory.orderId
            return true
        }

        // 计算要传输的数量
        let amount = room.terminal.store[resource.type] - resource.amount
        if (amount < 0) amount *= -1
        // 如果订单剩下的不多了 就用订单的数量
        if (targetOrder.amount < amount) amount = targetOrder.amount

        // 计算路费
        const cost = market.calcTransactionCost(amount, room.name, targetOrder.roomName)
        // 如果路费不够的话就添加物流任务然后继续等
        if (room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) < cost) {
            if (hasTransportTask(room)) return false
            addTransportTask(room, [{
                from: room.storage.id,
                to: room.terminal.id,
                resType: RESOURCE_ENERGY,
                amount: cost
            }])
            return false
        }

        // 执行交易
        const dealResult = Game.market.deal(targetOrder.id, amount, room.name)

        // 检查返回值
        if (dealResult === OK) {
            const crChange = (targetOrder.type === ORDER_BUY ? '+ ' : '- ') + (amount * targetOrder.price).toString() + ' Cr'
            const introduce = `${(targetOrder.type === ORDER_BUY ? '卖出' : '买入')} ${amount} ${targetOrder.resourceType} 单价: ${targetOrder.price}`
            env.log.success(`交易成功! ${introduce} ${crChange}`)
            delete memory.orderId

            db.updateIndexToNext()
            energyCheck(room.terminal)

            return false
        }
        else if (dealResult === ERR_INVALID_ARGS) delete memory.orderId
        else env.log.warning(`${room.name} 处理订单异常 ${dealResult}`)
    }

    return dealOrder
}
