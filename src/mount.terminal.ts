import { orderFilter } from './config'

// 挂载拓展到 terminal 原型
export default function () {
    _.assign(StructureTerminal.prototype, TerminalExtension.prototype)
}

// terminal 拓展
class TerminalExtension extends StructureTerminal {
    public work(): void {
        const orders = Game.market.getAllOrders(orderFilter)

        console.log(JSON.stringify(orders, null, 4))
    }
}