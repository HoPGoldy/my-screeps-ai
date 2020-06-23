import { stateScanInterval, DEAL_RATIO } from './setting'
import { creepApi } from './creepController'
import { createHelp } from './utils'

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
            this.add(RESOURCE_ENERGY, 20000, 'buy', 'share')
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
        if (!Memory.stats.rooms[this.room.name]) Memory.stats.rooms[this.room.name] = {}

        Memory.stats.rooms[this.room.name].power = this.store[RESOURCE_POWER]
    }

    /**
     * 平衡 power
     * 将自己存储的多余 power 转移至其他房间
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
                if (!room || !room.terminal) return { room: room.name, number: null }

                return {
                    room: room.name,
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
            const sendResult = this.send(task.resourceType, task.amount, task.target, `HaveFun! 来自 ${this.room.controller.owner.username} 的资源共享 - ${this.room.name}`)
            if (sendResult == OK) {
                // console.log(`${this.room.name} 完成了向 ${task.target} 的资源转移任务 ${task.resourceType} ${task.amount}`)
                delete this.room.memory.shareTask
                this.energyCheck()
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
                if (this.getEnergy(task.amount - this.store[RESOURCE_ENERGY]) == -2) Game.notify(`[${this.room.name}] 终端中央物流添加失败 —— 获取路费, ${task.amount - this.store[RESOURCE_ENERGY]}`)
                // this.getEnergy(task.amount - this.store[RESOURCE_ENERGY])
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
     * @returns 是否需要继续执行 ResourceListener
     */
    public dealOrder(resource: TerminalOrderTask): boolean {
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
            console.log(`[${this.room.name} terminal] 交易成功! ${introduce} ${crChange}`)
            delete this.room.memory.targetOrderId

            this.setNextIndex()
            this.energyCheck()
            
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
    public ResourceListener(resource: TerminalOrderTask): void {
        const resourceAmount = this.store[resource.type]
        // 卖出监听，超过才进行卖出
        if (resource.mod === 'sell') {
            if (resourceAmount <= resource.amount) return this.setNextIndex()
        }
        // 买入监听，再判断是从市场买入还是从其他房间共享
        else if (resource.mod === 'buy') {
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
        else {
            console.log(`[${this.room.name} Terminal] 未知监听类型 ${resource.mod}`)
            return this.setNextIndex()
        }

        // 根据交易策略来执行不同的逻辑
        if (resource.supplementAction === 'release') {
            this.releaseOrder(resource.type, (resourceAmount > resource.amount) ? ORDER_BUY : ORDER_SELL, resourceAmount - resource.amount)
        }
        else if (resource.supplementAction === 'take') {
            this.takeOrder(resource.type, (resourceAmount > resource.amount) ? ORDER_BUY : ORDER_SELL, resourceAmount - resource.amount, resource.priceLimit)
        }
        else {
            console.log(`[${this.room.name} Terminal] 未知交易策略 ${resource.supplementAction}`)
            return this.setNextIndex()
        }        
    }

    /**
     * 挂单
     * 
     * @param resourceType 要拍单的资源类型
     * @param type 订单类型
     * @param amount 要购买的数量
     */
    private releaseOrder(resourceType: MarketResourceConstant, type: ORDER_BUY | ORDER_SELL, amount: number) {
        console.log('挂单', this.room.name, resourceType, type, amount)
        // 检查房间内是否已经有对应资源的订单
        if (this.room.memory.holdOrders && resourceType in this.room.memory.holdOrders) {
            const order = Game.market.getOrderById(this.room.memory.holdOrders[resourceType])

            // 订单可用，保证其数量大于需求
            if (order && order.type === type) {
                // 数量不足，增大订单数量
                if (order.amount < amount) {
                    const actionResult = Game.market.extendOrder(order.id, amount - order.amount)
                    if (actionResult !== OK) console.log(`[${this.room.name} Terminal] 订单扩容异常, Game.market.extendOrder 返回值 ${actionResult}`) 
                    else console.log(`[${this.room.name} Terminal] 订单扩容成功 ${order.id}`) 
                }

                return this.setNextIndex()
            }
            // 订单不可用，移除缓存
            else delete this.room.memory.holdOrders[resourceType]
        }

        // 新增订单
        // const actionResult = Game.market.createOrder({ type, resourceType, })

        // 判断返回值
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
            // console.log(`[${this.room.name} terminal] 没有为 ${resource.type} 找到合适的订单`)
            return this.setNextIndex()
        }
        
        // console.log(`${this.room.name} 为 ${targetOrder.resourceType} 找到了一个合适的订单 类型: ${targetOrder.type} 单价: ${targetOrder.price}`)
        // 订单合适，写入缓存并要路费
        this.room.memory.targetOrderId = targetOrder.id
        
        if (amount < 0) amount *= -1
        // 想要卖出的数量有可能比订单数量大，所以计算路费的时候要考虑到
        const cost = Game.market.calcTransactionCost(amount > targetOrder.amount ? amount : targetOrder.amount, this.room.name, targetOrder.roomName)
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
    private getResourceByIndex(): TerminalOrderTask | null {
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
    private getOrder(filter: OrderFilter, priceLimit: number = undefined): Order | null {
        const orders = Game.market.getAllOrders(filter)
        // 没找到订单就返回空
        if (orders.length <= 0) return null

        // price 升序找到最适合的订单
        // 买入找price最低的 卖出找price最高的
        const sortedOrders = _.sortBy(orders, order => order.price)
        // console.log('订单单价', sortedOrders.map(order => order.price))
        const targetOrder = sortedOrders[filter.type === ORDER_SELL ? 0 : (sortedOrders.length - 1)]
        // console.log('选中订单价格', targetOrder.resourceType, targetOrder.type, targetOrder.price)

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
    private getOrderPrice(resourceType: MarketResourceConstant, type: ORDER_BUY | ORDER_SELL): void {
        
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
    public add(resourceType: ResourceConstant, amount: number, mod: TerminalListenerModes = 'buy', supplementAction: SupplementActions = 'take', priceLimit: number = undefined): void {
        if (!this.room.memory.terminalTasks) this.room.memory.terminalTasks = {}

        this.room.memory.terminalTasks[resourceType] = { amount, mod, supplementAction, priceLimit }
    }

    /**
     * 移除终端矿物监控
     * 
     * @param resourceType 要停止监控的资源类型
     */
    public remove(resourceType: ResourceConstant): void {
        if (!this.room.memory.terminalTasks) this.room.memory.terminalTasks = {}

        delete this.room.memory.terminalTasks[resourceType]
    }

    /**
     * 用户操作：将终端监听设置为默认值
     * 
     * @param hard 设为 true 来移除其默认值中不包含的监听资源
     */
    public reset(hard: boolean = false): string {
        // 模板任务
        const templateTask: TerminalListenerTask = {
            amount: 5000,
            mod: 'buy',
            supplementAction: 'share'
        }

        // 重置任务
        if (hard) this.room.memory.terminalTasks = {
            [RESOURCE_OXYGEN]: templateTask,
            [RESOURCE_HYDROGEN]: templateTask,
            [RESOURCE_KEANIUM]: templateTask,
            [RESOURCE_LEMERGIUM]: templateTask,
            [RESOURCE_ZYNTHIUM]: templateTask,
            [RESOURCE_UTRIUM]: templateTask,
            [RESOURCE_CATALYST]: templateTask
        }
        else {
            this.room.memory.terminalTasks[RESOURCE_OXYGEN] = templateTask
            this.room.memory.terminalTasks[RESOURCE_HYDROGEN] = templateTask
            this.room.memory.terminalTasks[RESOURCE_KEANIUM] = templateTask
            this.room.memory.terminalTasks[RESOURCE_LEMERGIUM] = templateTask
            this.room.memory.terminalTasks[RESOURCE_ZYNTHIUM] = templateTask
            this.room.memory.terminalTasks[RESOURCE_UTRIUM] = templateTask
            this.room.memory.terminalTasks[RESOURCE_CATALYST] = templateTask
        }
        
        this.room.memory.terminalIndex = 0
        
        return `已重置，当前监听任务如下:\n${this.show()}`
    }

    /**
     * 显示所有终端监听任务
     */
    public show(): string {
        if (!this.room.memory.terminalTasks) this.room.memory.terminalTasks = {}

        const resources = Object.keys(this.room.memory.terminalTasks)
        if (resources.length == 0) return '该房间暂无终端监听任务'

        const supplementActionIntroduce: { [action in SupplementActions]: string } = {
            release: '挂单',
            take: '拍单',
            share: '共享'
        }

        return resources.map(res => {
            const task = this.room.memory.terminalTasks[res]
            let result = `  ${res} [当前/期望] ${this.room.terminal.store[res]}/${task.amount} [监听类型] ${task.mod}`
            result += ` [资源来源] ${supplementActionIntroduce[task.supplementAction]}`
            if (task.priceLimit) result += ` [价格${task.mod === 'buy' ? '上限' : '下限'}] ${task.priceLimit}`
            return result
        }).join('\n')
    }

    public help(): string {
        return createHelp([
            {
                title: '添加资源监听',
                params: [
                    { name: 'resourceType', desc: '终端要监听的资源类型(只会监听自己库存中的数量)' },
                    { name: 'amount', desc: '指定类型的期望数量' },
                    { name: 'mod', desc: '[可选] 监听类型，分为 sell(卖出), buy(购买，默认)' },
                    { name: 'supplementAction', desc: '[可选] 补货来源，分为 share(共享), release(挂单), take(拍单，默认)'},
                    { name: 'priceLimit', desc: '[可选] 价格限制，若不填则通过历史平均价格检查'}
                ],
                functionName: 'add'
            },
            {
                title: '移除资源监听',
                params: [
                    { name: 'resourceType', desc: '移除监听的资源类型' }
                ],
                functionName: 'remove'
            },
            {
                title: '列出所有监听任务',
                functionName: 'show'
            },
            {
                title: '重设默认监听',
                params: [
                    { name: 'hard', desc: '[可选] 将移除非默认的监听任务，默认为 false' }
                ],
                functionName: 'reset'
            },
        ])
    }
}