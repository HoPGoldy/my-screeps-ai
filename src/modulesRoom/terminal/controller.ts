import { TerminalChannel, TerminalMode } from './constant'
import { setRoomStats } from '@/modulesGlobal/stats'
import { TerminalListenTask, TerminalMemory } from './types'
import { BASE_MINERAL } from '@/setting'
import RoomAccessor from '../RoomAccessor'
import { getExistOrder, getOrderPrice, isTaskMatched, searchOrder, stringifyTask, unstringifyTask } from './utils'
import { Color, colorful } from '@/modulesGlobal'

/**
 * Terminal 控制器
 * 
 * 监听房间中的共享任务和资源监听任务
 * 共享任务负责向其他房间发送资源，会优先执行
 * 资源监听由玩家自行发布，包括资源数量、来源和数量，在条件不满足（数量低于限制等）时会尝试从来源（market等）获取该资源
 */
export default class TerminalController extends RoomAccessor<TerminalMemory> {
    constructor(roomName: string) {
        super('terminal', roomName, 'terminal', undefined)
    }

    get terminal() {
        return this.room.terminal
    }

    public runTerminal(): void {
        if (!this.room.controller.owner || !this.memory || !this.terminal) return
        // 没有冷却好就跳过，或者每 10t 执行一次
        if (this.terminal.cooldown || Game.time % 10) return

        // 资源统计
        this.stateScanner()

        // 优先执行共享任务
        this.room.share.execShareTask(this.terminal)

        // 获取资源规则
        const task = this.getTask()
        if (!task) return 

        // 处理之前没做完的订单
        if (!this.dealOrder(task)) return

        // 没有待处理订单，继续监听任务
        this.resourceListener(task)
    }

    /**
     * 将终端监听规则设置为默认值
     * 
     * @param hard 设为 true 来移除其默认值中不包含的规则
     */
    public resetConfig(hard: boolean = false): void {
        if (!this.memory) {
            this.memory = { tasks: [], index: 0 }
        }

        if (hard) this.memory.tasks = []
        this.memory.index = 0

        // 该房间的矿物种类
        const roomMineral = this.room.mineral.mineralType

        // 默认选项为从资源共享协议获取所有的基础元素，自己房间的产出矿物则为提供
        BASE_MINERAL.forEach(res => {
            if (res === roomMineral) this.addTask(res, 30000, TerminalMode.Put, TerminalChannel.Share)
            else this.addTask(res, 5000, TerminalMode.Get, TerminalChannel.Share)
        })
    }

    /**
     * 统计自己存储中的资源数量
     * 目前只统计 power 数量
     */
    private stateScanner(): void {
        if (Game.time % 20) return
        setRoomStats(this.room.name, () => ({ power: this.terminal.store[RESOURCE_POWER] }))
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
        if (this.terminal.store[RESOURCE_POWER] < SHARE_LIMIE) return ERR_NOT_ENOUGH_RESOURCES

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
            .reduce((prev, next) => prev.number > next.number ? next : prev)

        // 添加共享任务
        if (!targetRoomInfo || !targetRoomInfo.room) return ERR_NOT_FOUND
        this.room.share.handle(targetRoomInfo.room, RESOURCE_POWER, SHARE_LIMIE)

        return OK
    }

    /**
     * 能量检查
     * 如果 terminal 中能量过多会返还至 storage
     */
    public energyCheck(): void {
        if (this.terminal.store[RESOURCE_ENERGY] >= 30000) {
            this.room.centerTransport.send(
                STRUCTURE_TERMINAL,
                STRUCTURE_STORAGE,
                RESOURCE_ENERGY,
                this.terminal.store[RESOURCE_ENERGY],
                STRUCTURE_TERMINAL
            )
        }
    }

    /**
     * 继续处理之前缓存的订单
     * 
     * @returns 是否有空闲精力继续工作
     */
    public dealOrder(resource: TerminalListenTask): boolean {
        // 没有订单需要处理
        if (!this.memory?.orderId) return true
        // 获取订单
        const targetOrder = Game.market.getOrderById(this.memory?.orderId)
        // 订单无效则移除缓存并继续检查
        if (!targetOrder) {
            delete this.memory?.orderId
            return true
        }

        // 计算要传输的数量
        let amount = this.terminal.store[resource.type] - resource.amount
        if (amount < 0) amount *= -1
        // 如果订单剩下的不多了 就用订单的数量
        if (targetOrder.amount < amount) amount = targetOrder.amount

        // 计算路费
        const cost = Game.market.calcTransactionCost(amount, this.room.name, targetOrder.roomName)
        // 如果路费不够的话就继续等
        if (this.terminal.store.getUsedCapacity(RESOURCE_ENERGY) < cost) {
            if (this.getEnergy(cost) == -2) Game.notify(`[${this.room.name}] 终端中央物流添加失败 —— 继续处理订单时路费, ${cost}`)
            // this.getEnergy(cost)
            return false
        }

        // 执行交易
        const dealResult = Game.market.deal(targetOrder.id, amount, this.room.name)

        // 检查返回值
        if (dealResult === OK) {
            const crChange = (targetOrder.type == ORDER_BUY ? '+ ' : '- ') + (amount * targetOrder.price).toString() + ' Cr' 
            const introduce = `${(targetOrder.type == ORDER_BUY ? '卖出' : '买入')} ${amount} ${targetOrder.resourceType} 单价: ${targetOrder.price}`
            this.log(`交易成功! ${introduce} ${crChange}`, Color.Green)
            delete this.memory?.orderId

            this.setNextIndex()
            this.energyCheck()
            
            return false
        }
        else if (dealResult === ERR_INVALID_ARGS) delete this.memory?.orderId
        else this.log(`${this.room.name} 处理订单异常 ${dealResult}`, Color.Yellow)
    }

    /**
     * 资源监听
     * 检查资源是否符合用户给定的期望
     */
    private resourceListener(resource: TerminalListenTask): void {
        const resourceAmount = this.terminal.store[resource.type]

        // 资源移出监听，超过才进行移出（卖出或共享资源）
        if (resource.mod === TerminalMode.Put) {
            if (resourceAmount <= resource.amount) return this.setNextIndex()
        }
        // 资源获取监听，低于标准才进行获取
        else if (resource.mod === TerminalMode.Get) {
            if (resourceAmount >= resource.amount) return this.setNextIndex()
        }
        else {
            this.log(`未知监听类型 ${resource.mod}`, Color.Yellow)
            return this.setNextIndex()
        }

        // 能通过上面的检查说明没有满足条件，根据交易策略来执行不同的逻辑
        switch (resource.channel) {

            // 需要挂单
            case TerminalChannel.Release:
                this.releaseOrder(
                    resource.type,
                    resource.mod === TerminalMode.Get ? ORDER_BUY : ORDER_SELL,
                    Math.abs(resourceAmount - resource.amount)
                )
            break

            // 需要拍单
            case TerminalChannel.Take:
                this.takeOrder(
                    resource.type,
                    // 这里订单类型取反是因为如果我想**买入**一个订单，那我就要拍下一个**卖单**
                    resource.mod === TerminalMode.Get ? ORDER_SELL : ORDER_BUY, 
                    Math.abs(resourceAmount - resource.amount),
                    resource.priceLimit
                )
            break

            // 进行共享
            case TerminalChannel.Share:
                if (resource.mod === TerminalMode.Get) this.room.share.request(resource.type, resource.amount - resourceAmount)
                else this.room.share.becomeSource(resource.type)

                return this.setNextIndex()
            break

            // 找不到对应的渠道
            default:
                this.log(`未知渠道 ${resource.channel}`, Color.Yellow)
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
        const order = getExistOrder(this.roomName, resourceType, type)
        
        // 存在就追加订单
        if (order) {
            // 价格有变化就更新价格
            const price = getOrderPrice(resourceType, type)
            if (price !== order.price) {
                const result = Game.market.changeOrderPrice(order.id, getOrderPrice(resourceType, type))

                if (result === ERR_NOT_ENOUGH_RESOURCES) {
                    this.log(`没有足够的 credit 来为 ${resourceType} ${type} 缴纳挂单费用`, Color.Yellow)
                    return this.setNextIndex()
                }
            }

            // 如果订单已经吃了一半了就扩容下数量
            if (order.remainingAmount / amount < 0.5) {
                const result = Game.market.extendOrder(order.id, amount - order.remainingAmount)

                if (result === ERR_NOT_ENOUGH_RESOURCES) {
                    this.log(`没有足够的 credit 来为 ${resourceType} ${type} 缴纳挂单费用`, Color.Yellow)
                }
            }
        }
        // 不存在就新建订单
        else {
            const result = Game.market.createOrder({
                type,
                resourceType,
                price: getOrderPrice(resourceType, type),
                totalAmount: amount,
                roomName: this.room.name
            })

            if (result === ERR_NOT_ENOUGH_RESOURCES) {
                this.log(`没有足够的 credit 来为 ${resourceType} ${type} 缴纳挂单费用`, Color.Yellow)
            }
            else if (result === ERR_FULL) {
                this.log(`订单数超过上限，无法为 ${resourceType} ${type} 创建新订单`, Color.Yellow)
            }
        }

        // 无论成功与否都直接下一个，因为挂单之后就不需要自己操作了
        this.setNextIndex()
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
        const targetOrder = searchOrder({ type, resourceType }, priceLimit)
        if (!targetOrder) return this.setNextIndex()
        
        // 订单合适，写入缓存并要路费
        this.memory.orderId = targetOrder.id as Id<Order>

        // 想要卖出的数量有可能比订单数量大，所以计算路费的时候要考虑到
        const cost = Game.market.calcTransactionCost(Math.min(amount, targetOrder.amount), this.room.name, targetOrder.roomName)
        // 如果路费不够的话就问 sotrage 要
        if (this.terminal.store.getUsedCapacity(RESOURCE_ENERGY) < cost) {
            if (this.getEnergy(cost) == -2) Game.notify(`[${this.room.name}] 终端中央物流添加失败 —— 拍单时等待路费, ${cost}`)
            // this.getEnergy(cost)
        }
    }

    /**
     * 将索引指向下一个要监听的资源
     */
    private setNextIndex(): void {
        let index = this.memory.index || 0
        const tasksLength = this.memory.tasks.length
        this.memory.index = index + 1 % tasksLength
    }

    /**
     * 从内存中索引获取正在监听的资源
     * 
     * @returns 该资源的信息，格式如下：
     *   @property {} type 资源类型
     *   @property {} amount 期望数量
     */
    private getTask(): TerminalListenTask | null {
        if (!this.memory.tasks || this.memory.tasks.length === 0) return null
        let index = this.memory.index || 0

        // 做个兜底，防止玩家手动移除任务后指针指向 undefined
        if (index >= this.memory.tasks.length) {
            this.memory.index = index = 0
        }

        // 对序列化的任务进行重建
        return unstringifyTask(this.memory.tasks[index])
    }

    /**
     * 从 storage 获取能量
     * @param amount 需要能量的数量
     */
    public getEnergy(amount: number): number {
        // 添加时会自动判断有没有对应的建筑，不会重复添加
        return this.room.centerTransport.addTask({
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
     * @param channel 交易策略
     * @param priceLimit 价格限制
     * @param supportRoomName 要支援的房间名【在 channel 为 support 时生效】
     */
    public addTask(
        resourceType: ResourceConstant,
        amount: number,
        mod: TerminalMode = TerminalMode.Get,
        channel: TerminalChannel = TerminalChannel.Take,
        priceLimit: number = undefined
    ): void {
        // 先移除同类型的监听任务
        this.removeByType(resourceType, mod, channel)

        // 非空兜底
        if (!this.memory)  this.memory = { tasks: [], index: 0 }
        if (!this.memory.tasks) this.memory.tasks = []

        // 再保存任务
        this.memory.tasks.push(stringifyTask({ mod, channel, type: resourceType, amount, priceLimit }))
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
        if (!this.memory.tasks) return OK
        if (_.isUndefined(index) || index >= this.memory.tasks.length) return ERR_INVALID_ARGS

        this.memory.tasks.splice(index, 1)
        if (this.memory.tasks.length <= 0) delete this.memory.tasks

        return OK
    }

    /**
     * 通过条件匹配任务
     * 
     * @param type 资源类型
     * @param mod 物流类型
     * @param channel 交易渠道
     * @returns 成功匹配的任务在内存 terminalTasks 中的索引，未找到返回 ERR_NOT_FOUND
     */
    public removeByType(type: ResourceConstant, mod: TerminalMode, channel: TerminalChannel): OK | ERR_NOT_FOUND {
        if (!this.memory.tasks) return ERR_NOT_FOUND

        _.remove(this.memory.tasks, taskStr => isTaskMatched(taskStr, type, mod, channel))
        return OK
    }

    /**
     * 显示所有终端监听任务
     */
    public show(): string {
        if (!this.memory || !this.memory.tasks) return '该房间暂无终端监听任务'

        const tasks = this.memory.tasks
        const currentIndex = this.memory.index

        // 从 code 转换为介绍，提高可读性
        const channelIntroduce: { [action in TerminalChannel]: string } = {
            [TerminalChannel.Take]: '拍单',
            [TerminalChannel.Release]: '挂单',
            [TerminalChannel.Share]: '共享'
        }

        const modeIntroduce: { [action in TerminalMode]: string } = {
            [TerminalMode.Get]: 'get',
            [TerminalMode.Put]: 'put'
        }

        // 遍历所有任务绘制结果
        return tasks.map((taskStr, index) => {
            const task = unstringifyTask(taskStr)
            let logs = [
                `[${index}] ${colorful(task.type, Color.Blue)}`,
                `[当前/期望] ${this.terminal.store[task.type]}/${task.amount}`,
                `[类型] ${modeIntroduce[task.mod]}`,
                `[渠道] ${channelIntroduce[task.channel]}`
            ]
            if (task.priceLimit) logs.push(`[价格${task.mod === TerminalMode.Get ? '上限' : '下限'}] ${task.priceLimit}`)
            if (index === currentIndex) logs.push(`< 正在检查`)
            return '  ' + logs.join(' ')
        }).join('\n')
    }
}