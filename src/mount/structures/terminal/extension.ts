import { DEAL_RATIO, terminalModes, terminalChannels } from 'setting'

/**
 * Terminal 原型拓展
 * 
 * 监听房间中的共享任务和资源监听任务
 * 共享任务负责向其他房间发送资源，会优先执行
 * 资源监听由玩家自行发布，包括资源数量、来源和数量，在条件不满足（数量低于限制等）时会尝试从来源（market等）获取该资源
 */
export default class TerminalExtension extends StructureTerminal {
    public work(): void {
        // 没有冷却好或者不到 10 tick 就跳过
        if (this.cooldown !== 0 || Game.time % 10) return
        
        // 资源统计
        this.stateScanner()

        // 优先执行共享任务
        this.execShareTask()

        // 执行终端工作
        const resource = this.getResourceByIndex()
        // 没有配置监听任务的话就跳过
        if (!resource) return 

        // 只有 dealOrder 下命令了才能继续执行 resourceListener
        if (this.dealOrder(resource)) this.resourceListener(resource)
    }

    /**
     * 建造完成回调
     * 修改 miner 的存放位置
     */
    public onBuildComplete(): void {
        // 有 extractor 了，发布矿工并添加对应的共享协议
        if (this.room.extractor) {
            this.room.releaseCreep('miner')
            this.addTask(this.room.mineral.mineralType, 30000, terminalModes.put, terminalChannels.share)
        }
    }

    /**
     * 统计自己存储中的资源数量
     * 目前只统计 power 数量
     */
    private stateScanner(): void {
        if (Game.time % 20) return
        if (!Memory.stats.rooms[this.room.name]) Memory.stats.rooms[this.room.name] = {}

        Memory.stats.rooms[this.room.name].power = this.store[RESOURCE_POWER]
    }

    /**
     * 平衡 power
     * 将自己存储的多余 power 转移至其他房间
     * 只会平衡到执行了 powerSpawn.on() 的房间
     * 
     * @returns ERR_NOT_ENOUGH_RESOURCES power 的资源不足
     * @returns ERR_NAME_EXISTS 房间内已经存在 shareTask
     * @returns ERR_NOT_FOUND 未找到有效的目标房间
     */
    public balancePower(): OK | ERR_NOT_ENOUGH_RESOURCES | ERR_NAME_EXISTS | ERR_NOT_FOUND {
        // 已经有共享任务了也不会执行
        if (this.room.memory.shareTask) return ERR_NAME_EXISTS

        // 允许共享的下限
        const SHARE_LIMIE = 10000
        // power 足够才能共享
        if (this.store[RESOURCE_POWER] < SHARE_LIMIE) return ERR_NOT_ENOUGH_RESOURCES

        if (!Memory.psRooms || Memory.psRooms.length <= 0) return ERR_NOT_FOUND
        
        // 找到 power 数量最少的已启用 ps 房间的信息
        const targetRoomInfo = Memory.psRooms
            // 统计出所有目标房间的 power 数量
            .map(roomName => {
                const room = Game.rooms[roomName]
                // 无法正常接收的不参与计算
                if (!room || !room.terminal) return { room: roomName, number: null }

                return {
                    room: roomName,
                    number: room.terminal.store[RESOURCE_POWER]
                }
            })
            // 移除掉所有不参与计算的房间
            .filter(info => info.number !== null)
            // 找到 power 数量最小的房间
            .reduce((prev, next) => {
                if (prev.number > next.number) return next
                else return prev
            })
        
        // 添加共享任务
        if (!targetRoomInfo || !targetRoomInfo.room) return ERR_NOT_FOUND
        this.room.shareAdd(targetRoomInfo.room, RESOURCE_POWER, SHARE_LIMIE)

        return OK
    }

    /**
     * 执行已经存在的共享任务
     */
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
                if (this.getEnergy(cost) == -2) Game.notify(`[${this.room.name}] 终端中央物流添加失败 —— 等待路费, ${cost}`)
                // this.getEnergy(cost)
                return 
            }

            // 路费够了就执行转移
            if (!this.room.controller.owner) return
            const sendResult = this.send(task.resourceType, task.amount, task.target, `HaveFun! 来自 ${this.room.controller.owner.username} 的资源共享 - ${this.room.name}`)
            
            if (sendResult == OK) {
                delete this.room.memory.shareTask
                this.energyCheck()
            }
            else if (sendResult == ERR_INVALID_ARGS) {
                this.log(`共享任务参数异常，无法执行传送，已移除`, 'yellow')
                delete this.room.memory.shareTask
            }
            else this.log(`执行共享任务出错, 错误码：${sendResult}`, 'yellow')
        }
        // 如果不足
        else {
            // 如果要共享能量，则从 storage 里拿
            if (task.resourceType === RESOURCE_ENERGY) {
                if (this.getEnergy(task.amount - this.store[RESOURCE_ENERGY]) == -2) {
                    this.log(`终端中央物流添加失败 —— 获取路费, ${task.amount - this.store[RESOURCE_ENERGY]}`, 'yellow', true)
                }
                // this.getEnergy(task.amount - this.store[RESOURCE_ENERGY])
            }
            // 资源不足就不予响应
            else {
                this.log(`由于 ${task.resourceType} 资源不足 ${this.store[task.resourceType] || 0}/${task.amount}，${task.target} 的共享任务已被移除`)
                delete this.room.memory.shareTask
            }
        }
    }

    /**
     * 能量检查
     * 如果 terminal 中能量过多会返还至 storage
     */
    private energyCheck(): void {
        if (this.store[RESOURCE_ENERGY] >= 30000) this.room.addCenterTask({
            submit: STRUCTURE_TERMINAL,
            source: STRUCTURE_TERMINAL,
            target: STRUCTURE_STORAGE,
            resourceType: RESOURCE_ENERGY,
            amount: this.store[RESOURCE_ENERGY]
        })
    }

    /**
     * 继续处理之前缓存的订单
     * 
     * @returns 是否需要继续执行 resourceListener
     */
    public dealOrder(resource: TerminalListenerTask): boolean {
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
            if (this.getEnergy(cost) == -2) Game.notify(`[${this.room.name}] 终端中央物流添加失败 —— 继续处理订单时路费, ${cost}`)
            // this.getEnergy(cost)
            return false
        }

        // 交易
        const dealResult = Game.market.deal(targetOrder.id, amount, this.room.name)
        // 检查返回值
        if (dealResult === OK) {
            const crChange = (targetOrder.type == ORDER_BUY ? '+ ' : '- ') + (amount * targetOrder.price).toString() + ' Cr' 
            const introduce = `${(targetOrder.type == ORDER_BUY ? '卖出' : '买入')} ${amount} ${targetOrder.resourceType} 单价: ${targetOrder.price}`
            this.log(`交易成功! ${introduce} ${crChange}`, 'green')
            delete this.room.memory.targetOrderId

            this.setNextIndex()
            this.energyCheck()
            
            return false // 把这个改成 true 可以加快交易速度
        }
        else if (dealResult === ERR_INVALID_ARGS) delete this.room.memory.targetOrderId
        else this.log(`${this.room.name} 处理订单异常 ${dealResult}`, 'yellow')
    }

    /**
     * 资源监听
     * 检查资源是否符合用户给定的期望
     */
    public resourceListener(resource: TerminalListenerTask): void {
        const resourceAmount = this.store[resource.type]
        // 资源移出监听，超过才进行移出（卖出或共享资源）
        if (resource.mod === terminalModes.put) {
            if (resourceAmount <= resource.amount) return this.setNextIndex()
        }
        // 资源获取监听，低于标准才进行获取
        else if (resource.mod === terminalModes.get) {
            if (resourceAmount >= resource.amount) return this.setNextIndex()
        }
        else {
            this.log(`未知监听类型 ${resource.mod}`, 'yellow')
            return this.setNextIndex()
        }

        // 能通过上面的检查说明没有满足条件，根据交易策略来执行不同的逻辑
        switch (resource.channel) {

            // 需要挂单
            case terminalChannels.release:
                this.releaseOrder(
                    resource.type,
                    resource.mod === terminalModes.get ? ORDER_BUY : ORDER_SELL,
                    Math.abs(resourceAmount - resource.amount)
                )
            break

            // 需要拍单
            case terminalChannels.take:
                this.takeOrder(
                    resource.type,
                    // 这里订单类型取反是因为如果我想**买入**一个订单，那我就要拍下一个**卖单**
                    resource.mod === terminalModes.get ? ORDER_SELL : ORDER_BUY, 
                    Math.abs(resourceAmount - resource.amount),
                    resource.priceLimit
                )
            break

            // 进行共享
            case terminalChannels.share:
                if (resource.mod === terminalModes.get) this.room.shareRequest(resource.type, resource.amount - resourceAmount)
                else this.room.shareAddSource(resource.type)
                
                return this.setNextIndex()
            break

            // 找不到对应的渠道
            default:
                this.log(`未知渠道 ${resource.channel}`, 'yellow')
                return this.setNextIndex()
            break
        }
    }

    /**
     * 挂单
     * 
     * @param resourceType 要拍单的资源类型
     * @param type 订单类型
     * @param amount 要购买的数量
     */
    private releaseOrder(resourceType: ResourceConstant, type: ORDER_BUY | ORDER_SELL, amount: number) {
        // 检查是否已经有对应资源的订单
        const order = this.getExistOrder(resourceType, type)
        
        // 存在就追加订单
        if (order) {
            // 价格有变化就更新价格
            const price = this.getOrderPrice(resourceType, type)
            if (price !== order.price) {
                const result = Game.market.changeOrderPrice(order.id, this.getOrderPrice(resourceType, type))

                if (result === ERR_NOT_ENOUGH_RESOURCES) {
                    this.log(`没有足够的 credit 来为 ${resourceType} ${type} 缴纳挂单费用`, 'yellow')
                    return this.setNextIndex()
                }
            }

            // 如果订单已经吃了一半了就扩容下数量
            if (order.remainingAmount / amount < 0.5) {
                const result = Game.market.extendOrder(order.id, amount - order.remainingAmount)

                if (result === ERR_NOT_ENOUGH_RESOURCES) {
                    this.log(`没有足够的 credit 来为 ${resourceType} ${type} 缴纳挂单费用`, 'yellow')
                }
            }
        }
        // 不存在就新建订单
        else {
            const result = Game.market.createOrder({
                type,
                resourceType,
                price: this.getOrderPrice(resourceType, type),
                totalAmount: amount,
                roomName: this.room.name
            })

            if (result === ERR_NOT_ENOUGH_RESOURCES) {
                this.log(`没有足够的 credit 来为 ${resourceType} ${type} 缴纳挂单费用`, 'yellow')
            }
            else if (result === ERR_FULL) {
                this.log(`订单数超过上限，无法为 ${resourceType} ${type} 创建新订单`, 'yellow')
            }
        }

        // 无论成功与否都直接下一个，因为挂单之后就不需要自己操作了
        this.setNextIndex()
    }

    /**
     * 在已有的订单中检查是否有相同类型的订单
     * 
     * @param resourceType 要搜索的资源类型
     * @param type 订单类型
     * @returns 找到的订单
     */
    private getExistOrder(resourceType: MarketResourceConstant, type: ORDER_BUY | ORDER_SELL): Order | undefined {
        // 遍历所有自己的订单进行检查
        for (const orderId in Game.market.orders) {
            const order = Game.market.orders[orderId]

            if (
                order.resourceType === resourceType && 
                order.type === type &&
                order.roomName === this.room.name
            ) return order
        }

        return undefined
    }

    /**
     * 拍单
     * 
     * @param resourceType 要拍单的资源类型
     * @param type 订单类型
     * @param amount 要购买的数量
     * @param priceLimit 价格限制
     */
    private takeOrder(resourceType: MarketResourceConstant, type: ORDER_BUY | ORDER_SELL, amount: number, priceLimit: number = undefined) {
        // 获取订单
        const targetOrder = this.getOrder({ type, resourceType }, priceLimit)

        if (!targetOrder) {
            return this.setNextIndex()
        }
        
        // 订单合适，写入缓存并要路费
        this.room.memory.targetOrderId = targetOrder.id

        // 想要卖出的数量有可能比订单数量大，所以计算路费的时候要考虑到
        const cost = Game.market.calcTransactionCost(Math.min(amount, targetOrder.amount), this.room.name, targetOrder.roomName)
        // 如果路费不够的话就问 sotrage 要
        if (this.store.getUsedCapacity(RESOURCE_ENERGY) < cost) {
            if (this.getEnergy(cost) == -2) Game.notify(`[${this.room.name}] 终端中央物流添加失败 —— 拍单时等待路费, ${cost}`)
            // this.getEnergy(cost)
        }
    }

    /**
     * 将索引指向下一个要监听的资源
     */
    private setNextIndex(): void {
        let index = this.room.memory.terminalIndex | 0
        const tasksLength = this.room.memory.terminalTasks.length
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
    private getResourceByIndex(): TerminalListenerTask | null {
        if (!this.room.memory.terminalTasks) return null
        let index = this.room.memory.terminalIndex | 0

        // 做个兜底，防止玩家手动移除任务后指针指向 undefined
        if (index >= this.room.memory.terminalTasks.length) {
            this.room.memory.terminalIndex = index = 0
        }

        // 对序列化的任务进行重建
        return this.unstringifyTask(this.room.memory.terminalTasks[index])
    }

    /**
     * 寻找合适的订单
     * 该方法**不会**将订单缓存到房间内存
     * 
     * @param config 市场交易任务
     * @returns 找到则返回订单, 否找返回 null
     */
    private getOrder(filter: OrderFilter, priceLimit: number = undefined): Order | null {
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
        else if (!this.checkPrice(targetOrder)) return null
        else return targetOrder
    }

    /**
     * 
     * @param resourceType 资源类型
     * @param type 买单还是买单
     */
    private getOrderPrice(resourceType: ResourceConstant, type: ORDER_BUY | ORDER_SELL): number | undefined {
        // 先查看缓存
        const cachePrice = global.resourcePrice[`${resourceType}/${type}`]
        if (cachePrice) return cachePrice

        let price = undefined
        // 卖单用市场均价
        if (type === ORDER_SELL) {
            const history = Game.market.getHistory(resourceType)
            if (history.length <= 0) this.log(`无法为 ${resourceType} ${type} 创建订单，未找到历史交易记录`, 'yellow', true)
            else price = history[0].avgPrice
        }
        // 买单挂最高
        else {
            // 拉取市场订单作为参考
            const orders = Game.market.getAllOrders({ resourceType, type })
            // 降序排列，价高在前，方便下面遍历
            const sortedOrders = _.sortBy(orders, order => -order.price)
            // 找到价格合理的订单中售价最高的
            const targetOrder = sortedOrders.find(order => this.checkPrice(order))

            price = targetOrder ? targetOrder.price : undefined
        }

        // 存入缓存并返回
        global.resourcePrice[`${resourceType}/${type}`] = price
        return price
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
     * 从 storage 获取能量
     * @param amount 需要能量的数量
     */
    private getEnergy(amount: number): number {
        // 添加时会自动判断有没有对应的建筑，不会重复添加
        return this.room.addCenterTask({
            submit: STRUCTURE_TERMINAL,
            source: STRUCTURE_STORAGE,
            target: STRUCTURE_TERMINAL,
            resourceType: RESOURCE_ENERGY,
            amount
        })
    }

    /**
     * 添加终端矿物监控
     * 
     * @param resourceType 要监控的资源类型
     * @param amount 期望的资源数量
     * @param mod 监听类型
     * @param supplementAction 交易策略
     * @param priceLimit 价格限制
     */
    public addTask(resourceType: ResourceConstant, amount: number, mod: TerminalModes = 0, channel: TerminalChannels = 0, priceLimit: number = undefined): void {
        // 先移除同类型的监听任务
        this.removeByType(resourceType, mod, channel)

        if (!this.room.memory.terminalTasks) this.room.memory.terminalTasks = []

        // 再保存任务
        this.room.memory.terminalTasks.push(this.stringifyTask({ mod, channel, type: resourceType, amount, priceLimit }))
    }

    /**
     * 移除终端矿物监控
     * 
     * @param index 要移除的任务索引
     * @return OK 移除完成
     * @returns ERR_INVALID_ARGS 传入了错误的索引
     * @returns ERR_NOT_FOUND 该房间暂无监听任务
     */
    public removeTask(index: number): OK | ERR_INVALID_ARGS | ERR_NOT_FOUND {
        if (!this.room.memory.terminalTasks) return OK
        if (_.isUndefined(index) || index >= this.room.memory.terminalTasks.length) return ERR_INVALID_ARGS

        this.room.memory.terminalTasks.splice(index, 1)
        if (this.room.memory.terminalTasks.length <= 0) delete this.room.memory.terminalTasks

        return OK
    }

    /**
     * @danger 注意，下面三个方法都涉及到了任务到字符串的解析与反解析，如果要进行修改的话需要同时对下面三个任务都进行修改
     * stringifyTask unstringifyTask matchTask
     */

    /**
     * 将任务序列化成字符串
     * 
     * @danger 注意，这个序列化格式是固定的，单独修改将会导致任务读取时出现问题
     * @param task 要序列化的任务
     */
    protected stringifyTask({ mod, channel, type, amount, priceLimit }: TerminalListenerTask): string {
        let stringifyTask = `${mod} ${channel} ${type} ${amount}`
        if (priceLimit) stringifyTask += ` ${priceLimit}`

        return stringifyTask
    }

    /**
     * 把字符串解析为任务
     * 
     * @danger 注意，这个序列化格式是固定的，单独修改将会导致无法读取已保存任务
     * @param taskStr 要反序列化的任务
     */
    protected unstringifyTask(taskStr: string): TerminalListenerTask {
        // 对序列化的任务进行重建
        const [ mod, channel, type, amount, priceLimit ] = taskStr.split(' ')

        return {
            mod: (Number(mod) as TerminalModes),
            channel: (Number(channel) as TerminalChannels),
            type: (type as ResourceConstant),
            amount: Number(amount),
            priceLimit: priceLimit ? Number(priceLimit) : undefined
        }
    }

    /**
     * 通过条件匹配任务
     * 
     * @param type 资源类型
     * @param mod 物流类型
     * @param channel 交易渠道
     * @returns 成功匹配的任务在内存 terminalTasks 中的索引，未找到返回 ERR_NOT_FOUND
     */
    public removeByType(type: ResourceConstant, mod: TerminalModes, channel: TerminalChannels): void {
        if (!this.room.memory.terminalTasks) return

        const matchKey = `${mod} ${channel} ${type}`
        this.room.memory.terminalTasks.find((task, index) => {
            if (!task.includes(matchKey)) return false

            // 移除找到的任务
            this.remove(index)
            return true
        })
    }
}