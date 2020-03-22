import { stateScanInterval, minerHervesteLimit, DEAL_RATIO } from './setting'
import { creepApi } from './creepController'

/**
 * Terminal 原型拓展
 * 
 * 监听房间中的共享任务和资源监听任务
 * 共享任务负责向其他房间发送资源，会优先执行
 * 资源监听由玩家自行发布，包括资源数量、来源和数量，在条件不满足（数量低于限制等）时会尝试从来源（market等）获取该资源
 */
export default class TerminalExtension extends StructureTerminal {
    public work(): void {
        this.stateScanner()

        // 没有冷却好或者不到 10 tick 就跳过
        if (this.cooldown !== 0 || Game.time % 10) return

        // 优先执行共享任务
        this.execShareTask()

        // 执行终端工作
        const resource = this.getResourceByIndex()
        // 没有配置监听任务的话就跳过
        if (!resource) return 

        // 只有 dealOrder 下命令了才能继续执行 ResourceListener
        if (this.dealOrder(resource)) this.ResourceListener(resource)
    }

    /**
     * 建造完成回调
     * 修改 miner 的存放位置
     */
    public onBuildComplete(): void {
        // 调整 miner 的目标存放建筑为 terminal
        const minerName = `${this.room.name} miner`
        if (creepApi.has(minerName)) creepApi.add(minerName, 'miner', {
            sourceId: this.room.mineral.id,
            targetId: this.id
        }, this.room.name)

        // 当已经有房间 8 级（保证有人能提供能量）并且自己不足 8 级时的时候才会添加能量共享请求
        if (Object.keys(Game.spawns).length > 3 && this.room.controller.level != 8) {
            this.room.addTerminalTask(RESOURCE_ENERGY, 20000, 'min', 'share')
            this.room.addUpgradeGroup()

            // 调整远程支援单位的能量来源
            creepApi.edit(`${this.room.name} RemoteUpgrader0`, { sourceId: this.id })
            creepApi.edit(`${this.room.name} RemoteUpgrader1`, { sourceId: this.id })
            creepApi.edit(`${this.room.name} RemoteBuilder1`, { sourceId: this.id })
        }
    }

    /**
     * 统计自己存储中的资源数量
     * 目前只统计 power 数量
     */
    private stateScanner(): void {
        if (Game.time % stateScanInterval) return
        if (!this.room.memory.stats) this.room.memory.stats = {}

        this.room.memory.stats.power = this.store[RESOURCE_POWER]
    }

    public execShareTask(): void {
        // 获取任务
        const task = this.room.memory.shareTask
        if (!task) return 

        // 如果自己存储的资源数量已经足够了
        if (this.store[task.resourceType] >= task.amount) {
            const cost = Game.market.calcTransactionCost(task.amount, this.room.name, task.target)
            
            // 如果要转移能量就需要对路费是否足够的判断条件进行下特殊处理
            const costCondition = (task.resourceType === RESOURCE_ENERGY) ?
                this.store[RESOURCE_ENERGY] - task.amount < cost :
                this.store[RESOURCE_ENERGY] < cost

            // 如果路费不够的话就继续等
            if (costCondition) {
                this.getEnergy(cost)
                return 
            }

            // 路费够了就执行转移
            const sendResult = this.send(task.resourceType, task.amount, task.target, `HaveFun! 来自 ${this.room.controller.owner.username} 的资源共享 - ${this.room.name}`)
            if (sendResult == OK) {
                // console.log(`${this.room.name} 完成了向 ${task.target} 的资源转移任务 ${task.resourceType} ${task.amount}`)
                delete this.room.memory.shareTask
            }
            else if (sendResult == ERR_INVALID_ARGS) {
                console.log(`${this.room.name} 中的共享任务参数异常，无法执行传送，已移除`)
                delete this.room.memory.shareTask
            }
            else {
                console.log(`${this.room.name} 执行共享任务出错, 错误码：${sendResult}`)
            }
        }
        // 如果不足
        else {
            // 如果要共享能量，则从 storage 里拿
            if (task.resourceType === RESOURCE_ENERGY) {
                this.getEnergy(task.amount - this.store[RESOURCE_ENERGY])
            }
        }
    }

    /**
     * 继续处理之前缓存的订单
     * 
     * @returns 是否需要继续执行 ResourceListener
     */
    public dealOrder(resource: ITerminalListenerTask): boolean {
        // 没有订单需要处理
        if (!this.room.memory.targetOrderId) return true
        // 获取订单
        const targetOrder = Game.market.getOrderById(this.room.memory.targetOrderId)
        // 订单无效则移除缓存并继续检查
        if (!targetOrder) {
            delete this.room.memory.targetOrderId
            return true
        }

        // 计算要传输的数量
        let amount = this.store[resource.type] - resource.amount
        if (amount < 0) amount *= -1
        // 如果订单剩下的不多了 就用订单的数量
        if (targetOrder.amount < amount) amount = targetOrder.amount
        // 计算路费
        const cost = Game.market.calcTransactionCost(amount, this.room.name, targetOrder.roomName)
        // 如果路费不够的话就继续等
        if (this.store.getUsedCapacity(RESOURCE_ENERGY) < cost) {
            this.getEnergy(cost)
            return false
        }

        // 交易
        const dealResult = Game.market.deal(targetOrder.id, amount, this.room.name)
        // 检查返回值
        if (dealResult === OK) {
            const crChange = (targetOrder.type == ORDER_BUY ? '+ ' : '- ') + (amount * targetOrder.price).toString() + ' Cr' 
            const introduce = `${(targetOrder.type == ORDER_BUY ? '卖出' : '买入')} ${amount} ${targetOrder.resourceType} 单价: ${targetOrder.price}`
            console.log(`[${this.room.name} terminal] 交易成功! ${introduce} ${crChange}`)
            delete this.room.memory.targetOrderId
            this.setNextIndex()
            return false // 把这个改成 true 可以加快交易速度
        }
        else if (dealResult === ERR_INVALID_ARGS) {
            delete this.room.memory.targetOrderId
            
        }
        else {
            console.log(`[终端警告] ${this.room.name} 处理订单异常 ${dealResult}`)
        }
    }

    /**
     * 资源监听
     * 检查资源是否符合用户给定的期望
     */
    public ResourceListener(resource: ITerminalListenerTask): void {
        const resourceAmount = this.store[resource.type]
        // 最大值监听，超过才进行卖出
        if (resource.mod == 'max') {
            if (resourceAmount <= resource.amount) return this.setNextIndex()
        }
        // 最小值监听，再判断是从市场买入还是从其他房间共享
        else if (resource.mod == 'min') {
            // console.log('最小值检查！', resourceAmount, resource.type, resource.amount)
            if (resourceAmount >= resource.amount) return this.setNextIndex()
            else {
                // 从其他房间共享
                if (resource.supplementAction == 'share') {
                    const getShareRequest = this.room.shareRequest(resource.type, resource.amount - resourceAmount)
                    // console.log(`${this.room.name} 想要从资源共享获取 ${resource.type} 数量: ${resource.amount - resourceAmount}  请求结果为 ${getShareRequest}`)
                    return this.setNextIndex()
                }
            }
        }
        // 双向监听，必须相等才不会触发操作
        else {
            if (resourceAmount == resource.amount) return this.setNextIndex()
        }

        // 获取订单
        const targetOrder = this.getOrder({
            // 根据存储的数量是否超过上限来决定是买单还是卖单
            type: (resourceAmount > resource.amount) ? ORDER_BUY : ORDER_SELL,
            resourceType: resource.type
        })
        if (!targetOrder) {
            // console.log(`[${this.room.name} terminal] 没有为 ${resource.type} 找到合适的订单`)
            this.setNextIndex()
            return
        }
        
        // console.log(`${this.room.name} 为 ${targetOrder.resourceType} 找到了一个合适的订单 类型: ${targetOrder.type} 单价: ${targetOrder.price}`)
        // 订单合适，写入缓存并要路费
        this.room.memory.targetOrderId = targetOrder.id
        // 计算要传输的数量
        let amount = resourceAmount - resource.amount
        if (amount < 0) amount *= -1
        // 计算路费
        const cost = Game.market.calcTransactionCost(amount, this.room.name, targetOrder.roomName)
        // 如果路费不够的话就问 sotrage 要
        if (this.store.getUsedCapacity(RESOURCE_ENERGY) < cost) {
            this.getEnergy(cost)
        }
    }

    /**
     * 将索引指向下一个要监听的资源
     */
    private setNextIndex(): void {
        let index = this.room.memory.terminalIndex | 0
        const tasksLength = Object.keys(this.room.memory.terminalTasks).length
        // 循环设置索引
        this.room.memory.terminalIndex = (index + 1 >= tasksLength) ? 0 : index + 1
    }

    /**
     * 从内存中索引获取正在监听的资源
     * 
     * @returns 该资源的信息，格式如下：
     *   @property {} type 资源类型
     *   @property {} amount 期望数量
     */
    private getResourceByIndex(): ITerminalListenerTask | null {
        if (!this.room.memory.terminalTasks) return null
        const resources = Object.keys(this.room.memory.terminalTasks)
        if (!resources || resources.length == 0) return null
        const index = this.room.memory.terminalIndex | 0

        const resourceType = resources[index]

        return {
            type: <ResourceConstant>resourceType,
            ...this.room.memory.terminalTasks[resourceType]
        }
    }

    /**
     * 寻找合适的订单
     * 该方法**不会**将订单缓存到房间内存
     * 
     * @param config 市场交易任务
     * @returns 找到则返回订单, 否找返回 null
     */
    private getOrder(filter: OrderFilter): Order | null {
        const orders = Game.market.getAllOrders(filter)
        // 没找到订单就返回空
        if (orders.length <= 0) return null

        // price 升序找到最适合的订单
        // 买入找price最低的 卖出找price最高的
        const sortedOrders = _.sortBy(orders, order => order.price)
        // console.log('订单单价', sortedOrders.map(order => order.price))
        const targetOrder = sortedOrders[filter.type === ORDER_SELL ? 0 : (sortedOrders.length - 1)]
        // console.log('选中订单价格', targetOrder.resourceType, targetOrder.type, targetOrder.price)

        // 最后进行均价检查
        if (!this.checkPrice(targetOrder)) return null
        else return targetOrder
    }

    /**
     * 检查订单单价是否合适
     * 防止投机玩家的过低或过高订单
     * 
     * @param targetOrder 目标订单
     */
    private checkPrice(targetOrder: Order): boolean {
        const history = Game.market.getHistory(<ResourceConstant>targetOrder.resourceType)
        // 没有历史记录的话直接运行购买
        if (history.length <= 0) return true
        // 以昨日均价为准
        // console.log(JSON.stringify(history[0], null, 4))
        const avgPrice = history[0].avgPrice

        // 目标订单的价格要在规定好的价格区间内浮动才算可靠
        // 卖单的价格不能太高
        if (targetOrder.type == ORDER_SELL) {
            // console.log(`${targetOrder.price} <= ${avgPrice * DEAL_RATIO.MAX}`)
            if (targetOrder.price <= avgPrice * DEAL_RATIO.MAX) return true
        }
        // 买单的价格不能太低
        else {
            // console.log(`${targetOrder.price} >= ${avgPrice * DEAL_RATIO.MIN}`)
            if (targetOrder.price >= avgPrice * DEAL_RATIO.MIN) return true
        }
        return false
    }

    /**
     * 从 storage 获取能量
     * @param amount 需要能量的数量
     */
    private getEnergy(amount: number): void {
        // 发布前先检查下有没有任务
        if (this.room.hasCenterTask(STRUCTURE_TERMINAL)) return 

        this.room.addCenterTask({
            submit: STRUCTURE_TERMINAL,
            source: STRUCTURE_STORAGE,
            target: STRUCTURE_TERMINAL,
            resourceType: RESOURCE_ENERGY,
            amount
        })
    }
}