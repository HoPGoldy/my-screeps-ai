import mountRoomBase from './mount.roomBase'
import { createHelp, log, createRoomLink, createElement } from './utils'
import { ENERGY_SHARE_LIMIT, BOOST_RESOURCE, DEFAULT_FLAG_NAME, ROOM_TRANSFER_TASK } from './setting'
import { creepApi } from './creepController'

// 挂载拓展到 Room 原型
export default function () {
    // 优先挂载 Room 基础服务
    mountRoomBase()

    // 再挂载 Room 拓展
    _.assign(Room.prototype, RoomExtension.prototype)
    _.assign(RoomPosition.prototype, PositionExtension.prototype)
}

class RoomExtension extends Room {
    /**
     * 全局日志
     * 
     * @param content 日志内容
     * @param prefixes 前缀中包含的内容
     * @param color 日志前缀颜色
     * @param notify 是否发送邮件
     */
    log(content:string, instanceName: string = '', color: Colors | undefined = undefined, notify: boolean = false): void {
        // 为房间名添加超链接
        const roomName = createRoomLink(this.name)
        // 生成前缀并打印日志
        const prefixes = instanceName ? [ roomName, instanceName ] : [ roomName ]
        log(content, prefixes, color, notify)
    }
    /**
     * 添加任务
     * 
     * @param task 要提交的任务
     * @param priority 任务优先级位置，默认追加到队列末尾。例：该值为 0 时将无视队列长度直接将任务插入到第一个位置
     * @returns 任务的排队位置, 0 是最前面，负数为添加失败，-1 为已有同种任务,-2 为目标建筑无法容纳任务数量
     */
    public addCenterTask(task: ITransferTask, priority: number = null): number {
        if (this.hasCenterTask(task.submit)) return -1
        // 由于这里的目标建筑限制型和非限制型存储都有，这里一律作为非限制性检查来减少代码量
        if (this[task.target] && (this[task.target].store as StoreDefinitionUnlimited).getFreeCapacity() < task.amount) return -2

        if (!priority) this.memory.centerTransferTasks.push(task)
        else this.memory.centerTransferTasks.splice(priority, 0, task)

        return this.memory.centerTransferTasks.length - 1
    }

    /**
     * 向房间中发布 power 请求任务
     * 该方法已集成了 isPowerEnabled 判定，调用该方法之前无需额外添加房间是否启用 power 的逻辑
     * 
     * @param task 要添加的 power 任务
     * @param priority 任务优先级位置，默认追加到队列末尾。例：该值为 0 时将无视队列长度直接将任务插入到第一个位置
     * @returns OK 添加成功
     * @returns ERR_NAME_EXISTS 已经有同名任务存在了
     * @returns ERR_INVALID_TARGET 房间控制器未启用 power
     */
    public addPowerTask(task: PowerConstant, priority: number = null): OK | ERR_NAME_EXISTS | ERR_INVALID_TARGET {
        // 初始化时添加房间初始化任务（编号 -1）
        if (!this.memory.powerTasks) this.memory.powerTasks = [ -1 as PowerConstant ]
        if (!this.controller.isPowerEnabled) return ERR_INVALID_TARGET

        // 有相同的就拒绝添加
        if (this.hasPowerTask(task)) return ERR_NAME_EXISTS

        // 发布任务到队列
        if (!priority) this.memory.powerTasks.push(task)
        // 追加到队列指定位置
        else this.memory.powerTasks.splice(priority, 0, task)
        
        return OK
    }

    /**
     * 检查是否已经存在指定任务
     * 
     * @param task 要检查的 power 任务
     */
    private hasPowerTask(task: PowerConstant): boolean {
        return this.memory.powerTasks.find(power => power === task) ? true : false
    }

    /**
     * 获取当前的 power 任务
     */
    public getPowerTask(): PowerConstant | undefined {
        if (!this.memory.powerTasks || this.memory.powerTasks.length <= 0) return undefined
        else return this.memory.powerTasks[0]
    }

    /**
     * 挂起当前任务
     * 将会把最前面的 power 任务移动到队列末尾
     */
    public hangPowerTask(): void {
        const task = this.memory.powerTasks.shift()
        this.memory.powerTasks.push(task)
    }

    /**
     * 移除第一个 power 任务
     */
    public deleteCurrentPowerTask(): void {
        this.memory.powerTasks.shift()
    }

    /**
     * 用户操作：addCenterTask - 添加中央运输任务
     * 
     * @param targetId 资源存放建筑类型
     * @param sourceId 资源来源建筑类型
     * @param resourceType 要转移的资源类型
     * @param amount 资源数量
     */
    public ctadd(target: CenterStructures, source: CenterStructures, resourceType: ResourceConstant, amount: number): string {
        if (!this.memory.centerTransferTasks) this.memory.centerTransferTasks = []
        const addResult = this.addCenterTask({
            submit: this.memory.centerTransferTasks.length,
            target,
            source,
            resourceType,
            amount
        })
        return `已向 ${this.name} 中央任务队列推送任务，当前排队位置: ${addResult}`
    }

    /**
     * 用户操作：将能量从 storage 转移至 terminal 里
     * 
     * @param amount 要转移的能量数量, 默认 100k
     */
    public pute(amount: number = 100000): string {
        const addResult = this.addCenterTask({
            submit: this.memory.centerTransferTasks.length,
            target: STRUCTURE_TERMINAL,
            source: STRUCTURE_STORAGE,
            resourceType: RESOURCE_ENERGY,
            amount
        })
        return `已向 ${this.name} 中央任务队列推送能量转移任务，storage > terminal, 数量 ${amount}，当前排队位置: ${addResult}`
    }

    /**
     * 用户操作：将能量从 terminal 转移至 storage 里
     * 
     * @param amount 要转移的能量数量, 默认全部转回来
     */
    public gete(amount: number = null): string {
        if (!this.terminal) return `未找到 ${this.name} 中的终端`
        if (amount === null) amount = this.terminal.store[RESOURCE_ENERGY]
        
        const addResult = this.addCenterTask({
            submit: this.memory.centerTransferTasks.length,
            target: STRUCTURE_STORAGE,
            source: STRUCTURE_TERMINAL,
            resourceType: RESOURCE_ENERGY,
            amount
        })
        return `已向 ${this.name} 中央任务队列推送能量转移任务，terminal > storage, 数量 ${amount}，当前排队位置: ${addResult}`
    }

    /**
     * 用户操作：向指定房间发送能量
     * 注意，该操作会自动从 storage 里取出能量
     * 
     * @param roomName 目标房间名
     * @param amount 要发送的数量, 默认 100k
     */
    public givee(roomName: string, amount: number = 100000): string {
        const logs = []
        if (!this.terminal) return `[能量共享] 未发现 Terminal，共享终止`
        // 如果在执行其他任务则将其覆盖，因为相对于用户操作来说，其他模块发布的资源共享任务优先级肯定要低
        // 并且其他模块的共享任务就算被删除了，过一段时间之后它也会再次发布并重新添加
        if (this.memory.shareTask) {
            const task = this.memory.shareTask
            logs.push(`┖─ 因此移除的共享任务为: 目标房间：${task.target} 资源类型：${task.resourceType} 资源总量：${task.amount}`)
        }

        // 计算路费，防止出现路费 + 资源超过终端上限的问题出现
        const cost = Game.market.calcTransactionCost(amount, this.name, roomName)
        if (amount + cost - this.terminal.store[RESOURCE_ENERGY] > this.terminal.store.getFreeCapacity()) {
            return `[能量共享] 添加共享任务失败，资源总量超出终端上限：发送数量(${amount}) + 路费(${cost}) = ${amount + cost} Terminal 剩余容量 ${this.terminal.store.getFreeCapacity()}`
        }

        this.memory.shareTask = {
            target: roomName,
            amount,
            resourceType: RESOURCE_ENERGY
        }

        logs.unshift(`[能量共享] 任务已填加，移交终端处理：房间名：${roomName} 共享数量：${amount} 路费：${cost}`)

        return logs.join('\n')
    }

    /**
     * 用户操作 - 发送 power 到指定房间
     * 
     * @param RoomName 要发送到的房间名
     * @param amount 发送的数量
     */
    public givep(RoomName: string, amount: number = 5000) {
        return this.giver(RoomName, RESOURCE_POWER, amount)
    }

    /**
     * 用户操作 - 成交订单
     * 
     * @param id 交易的订单 id
     * @param amount 交易的数量，默认为最大值
     */
    public deal(id: string, amount: number): string {
        if (!amount) {
            const order = Game.market.getOrderById(id)
            if (!order) return `[${this.name}] 订单 ${id} 不存在`

            amount = order.amount
        }

        const actionResult = Game.market.deal(id, amount, this.name)

        if (actionResult === OK) return `[${this.name}] 交易成功`
        else return `[${this.name}] 交易异常，Game.market.deal 返回值 ${actionResult}`
    }

    /**
     * 添加禁止通行位置
     * 
     * @param creepName 禁止通行点位的注册者
     * @param pos 禁止通行的位置
     */
    public addRestrictedPos(creepName: string, pos: RoomPosition): void {
        if (!this.memory.restrictedPos) this.memory.restrictedPos = {}

        this.memory.restrictedPos[creepName] = this.serializePos(pos)
    }

    /**
     * 获取房间内的禁止通行点位
     */
    public getRestrictedPos(): { [creepName: string]: string } {
        return this.memory.restrictedPos
    }

    /**
     * 将指定位置从禁止通行点位中移除
     * 
     * @param creepName 要是否点位的注册者名称
     */
    public removeRestrictedPos(creepName: string): void {
        if (!this.memory.restrictedPos) this.memory.restrictedPos = {}

        delete this.memory.restrictedPos[creepName]
    }

    /**
     * 将指定位置序列化为字符串
     * 形如: 12/32/E1N2
     * 
     * @param pos 要进行压缩的位置
     */
    public serializePos(pos: RoomPosition): string {
        return `${pos.x}/${pos.y}/${pos.roomName}`
    }

    /**
     * 向生产队列里推送一个生产任务
     * 
     * @param taskName config.creep.ts 文件里 creepConfigs 中定义的任务名
     * @returns 当前任务在队列中的排名
     */
    public addSpawnTask(taskName: string): number | ERR_NAME_EXISTS {
        if (!this.memory.spawnList) this.memory.spawnList = []
        // 先检查下任务是不是已经在队列里了
        if (!this.hasSpawnTask(taskName)) {
            // 任务加入队列
            this.memory.spawnList.push(taskName)
            return this.memory.spawnList.length - 1
        }
        // 如果已经有的话返回异常
        else return ERR_NAME_EXISTS
    }

    /**
     * 检查生产队列中是否包含指定任务
     * 
     * @param taskName 要检查的任务名
     * @returns true/false 有/没有
     */
    public hasSpawnTask(taskName: string): boolean {
        if (!this.memory.spawnList) this.memory.spawnList = []
        return this.memory.spawnList.indexOf(taskName) > -1
    }

    /**
     * 清空任务队列
     * 非测试情况下不要调用！
     */
    public clearSpawnTask(): void {
        this.memory.spawnList = []
    }

    /**
     * 将当前任务挂起
     * 任务会被移动至队列末尾
     */
    public hangSpawnTask(): void {
        const task = this.memory.spawnList.shift()
        this.memory.spawnList.push(task)
    }

    /**
     * 将位置序列化字符串转换为位置
     * 位置序列化字符串形如: 12/32/E1N2
     * 
     * @param posStr 要进行转换的字符串
     */
    public unserializePos(posStr: string): RoomPosition | undefined {
        // 形如 ["12", "32", "E1N2"]
        const infos = posStr.split('/')

        return infos.length === 3 ? new RoomPosition(Number(infos[0]), Number(infos[1]), infos[2]) : undefined
    }

    /**
     * 用户操作：向指定房间发送资源
     * 注意，请保证资源就在 Terminal 中
     * 
     * @param roomName 目标房间名
     * @param resourceType 要共享的资源类型
     * @param amount 要发送的数量, 默认 100k
     */
    public giver(roomName: string, resourceType: ResourceConstant, amount: number = 1000): string {
        const logs = []
        // 如果在执行其他任务则将其覆盖，因为相对于用户操作来说，其他模块发布的资源共享任务优先级肯定要低
        // 并且其他模块的共享任务就算被删除了，过一段时间之后它也会再次发布并重新添加
        if (this.memory.shareTask) {
            const task = this.memory.shareTask
            logs.push(`┖─ 因此移除的共享任务为: 目标房间：${task.target} 资源类型：${task.resourceType} 资源总量：${task.amount}`)
        }

        // 检查资源是否足够
        if (!this.terminal) return `[资源共享] 该房间没有终端`
        const resourceAmount = this.terminal.store[resourceType]
        if (! resourceAmount || resourceAmount < amount) return `[资源共享] 数量不足 ${resourceType} 剩余 ${resourceAmount | 0}`

        // 计算路费，防止出现路费 + 资源超过终端上限的问题出现
        const cost = Game.market.calcTransactionCost(amount, this.name, roomName)
        if (amount + cost > TERMINAL_CAPACITY) {
            return `[资源共享] 添加共享任务失败，资源总量超出终端上限：发送数量(${amount}) + 路费(${cost}) = ${amount + cost}`
        }

        this.memory.shareTask = {
            target: roomName,
            amount,
            resourceType
        }

        logs.unshift(`[资源共享] 任务已填加，移交终端处理：房间名：${roomName} 共享数量：${amount} 路费：${cost}`)

        return logs.join('\n')
    }

    /**
     * 每个建筑同时只能提交一个任务
     * 
     * @param submit 提交者的身份
     * @returns 是否有该任务
     */
    public hasCenterTask(submit: CenterStructures | number): boolean {
        if (!this.memory.centerTransferTasks) this.memory.centerTransferTasks = []
        
        const task = this.memory.centerTransferTasks.find(task => task.submit === submit)
        return task ? true : false
    }

    /**
     * 暂时挂起当前任务
     * 会将任务放置在队列末尾
     * 
     * @returns 任务的排队位置, 0 是最前面
     */
    public hangCenterTask(): number {
        const task = this.memory.centerTransferTasks.shift()
        this.memory.centerTransferTasks.push(task)

        return this.memory.centerTransferTasks.length - 1
    }

    /**
     * 获取中央队列中第一个任务信息
     * 
     * @returns 有任务返回任务, 没有返回 null
     */
    public getCenterTask(): ITransferTask | null {
        if (!this.memory.centerTransferTasks) this.memory.centerTransferTasks = []
        
        if (this.memory.centerTransferTasks.length <= 0) {
            return null
        }
        else {
            return this.memory.centerTransferTasks[0]
        }
    }

    /**
     * 处理任务
     * 
     * @param submitId 提交者的 id
     * @param transferAmount 本次转移的数量
     */
    public handleCenterTask(transferAmount: number): void {
        this.memory.centerTransferTasks[0].amount -= transferAmount
        if (this.memory.centerTransferTasks[0].amount <= 0) {
            this.deleteCurrentCenterTask()
        }
    }

    /**
     * 移除当前中央运输任务
     */
    public deleteCurrentCenterTask(): void {
        this.memory.centerTransferTasks.shift()
    }

    /**
     * 向房间物流任务队列推送新的任务
     * 
     * @param task 要添加的任务
     * @param priority 任务优先级位置，默认追加到队列末尾。例：该值为 0 时将无视队列长度直接将任务插入到第一个位置
     * @returns 任务的排队位置, 0 是最前面，-1 为添加失败（已有同种任务）
     */
    public addRoomTransferTask(task: RoomTransferTasks, priority: number = null): number {
        if (this.hasRoomTransferTask(task.type)) return -1

        // 默认追加到队列末尾
        if (!priority) {
            this.memory.transferTasks.push(task)
            return this.memory.transferTasks.length - 1
        }
        // 追加到队列指定位置
        else {
            this.memory.transferTasks.splice(priority, 0, task)
            return priority < this.memory.transferTasks.length ? priority : this.memory.transferTasks.length - 1
        }
    }

    /**
     * 是否有相同的房间物流任务
     * 房间物流队列中一种任务只允许同时存在一个
     * 
     * @param taskType 任务类型
     */
    public hasRoomTransferTask(taskType: string): boolean {
        if (!this.memory.transferTasks) this.memory.transferTasks = []
        
        const task = this.memory.transferTasks.find(task => task.type === taskType)
        return task ? true : false
    }

    /**
     * 获取当前的房间物流任务
     */
    public getRoomTransferTask(): RoomTransferTasks | null {
        if (!this.memory.transferTasks) this.memory.transferTasks = []
        
        if (this.memory.transferTasks.length <= 0) {
            return null
        }
        else {
            return this.memory.transferTasks[0]
        }
    }

    /**
     * 处理房间物流任务
     * 此方法会在实装 lab 物流任务后进行扩充
     * 
     * @returns 该任务是否完成
     */
    public handleRoomTransferTask(): void {
        this.deleteCurrentRoomTransferTask()
    }

    /**
     * 更新 labIn 任务信息
     * @param resourceType 要更新的资源 id
     * @param amount 要更新成的数量
     */
    public handleLabInTask(resourceType: ResourceConstant, amount: number): boolean {
        const currentTask = <ILabIn>this.getRoomTransferTask()
        // 判断当前任务为 labin
        if (currentTask.type == ROOM_TRANSFER_TASK.LAB_IN) {
            // 找到对应的底物
            for (const index in currentTask.resource) {
                if (currentTask.resource[Number(index)].type == resourceType) {
                    // 更新底物数量
                    currentTask.resource[Number(index)].amount = amount
                    break
                }
            }
            // 更新对应的任务
            this.memory.transferTasks.splice(0, 1, currentTask)
            return true
        }
        else return false
    }

    /**
     * 移除当前处理的房间物流任务
     * 并统计至 Memory.stats
     */
    public deleteCurrentRoomTransferTask(): void {
        const finishedTask = this.memory.transferTasks.shift()

        // // 先兜底
        if (!Memory.stats) Memory.stats = { rooms: {} }
        if (!Memory.stats.roomTaskNumber) Memory.stats.roomTaskNumber = {}

        // 如果这个任务之前已经有过记录的话就增 1
        if (Memory.stats.roomTaskNumber[finishedTask.type]) Memory.stats.roomTaskNumber[finishedTask.type] += 1
        // 没有就设为 1
        else Memory.stats.roomTaskNumber[finishedTask.type] = 1
    }

    /**
     * 用户操作 - 查看房间工作状态
     */
    public fs(): string {
        if (!this.factory) return `[${this.name}] 未建造工厂`
        return this.factory.stats()
    }

    /**
     * 可视化用户操作 - 添加终端监听任务
     */
    public tadd(): string { 
        return createElement.form('terminalAdd', [
            { name: 'resourceType', label: '资源类型', type: 'input', placeholder: '资源的实际值' },
            { name: 'amount', label: '期望值', type: 'input', placeholder: '交易策略的触发值' },
            { name: 'priceLimit', label: '[可选]价格限制', type: 'input', placeholder: '置空该值以启动价格检查' },
            { name: 'mod', label: '物流方向', type: 'select', options: [
                { value: 0, label: '获取' },
                { value: 1, label: '提供' }
            ]},
            { name: 'channel', label: '物流渠道', type: 'select', options: [
                { value: 0, label: '拍单' },
                { value: 1, label: '挂单' },
                { value: 2, label: '共享' }
            ]}
        ], {
            content: '提交',
            command: `({resourceType, amount, mod, channel, priceLimit}) => Game.rooms['${this.name}'].terminal.add(resourceType, amount, mod, channel, priceLimit)`
        })
    }

    /**
     * 用户操作：addTerminalTask
     */
    public ta(resourceType: ResourceConstant, amount: number, mod: TerminalModes = 0, channel: TerminalChannels = 0, priceLimit: number = undefined): string { 
        if (!this.terminal) return `[${this.name}] 未找到终端`

        return this.terminal.add(resourceType, amount, mod, channel, priceLimit)
    }

    /**
     * 用户操作：removeTerminalTask
     */
    public tr(index: number): string { 
        if (!this.terminal) return `[${this.name}] 未找到终端`

        return this.terminal.remove(index)
    }

    /**
     * 用户操作：showTerminalTask
     */
    public ts(): string {
        if (!this.terminal) return `[${this.name}] 未找到终端`

        return this.terminal.show()
    }

    /**
     * 向其他房间请求资源共享
     * 
     * @param resourceType 请求的资源类型
     * @param amount 请求的数量
     */
    public shareRequest(resourceType: ResourceConstant, amount: number): boolean {
        const targetRoom = this.shareGetSource(resourceType, amount)
        if (!targetRoom) return false

        const addResult = targetRoom.shareAdd(this.name, resourceType, amount)
        return addResult
    }

    /**
     * 将本房间添加至资源来源表中
     * 
     * @param resourceType 添加到的资源类型
     */
    public shareAddSource(resourceType: ResourceConstant): boolean {
        if (!(resourceType in Memory.resourceSourceMap)) Memory.resourceSourceMap[resourceType] = []
        
        const alreadyRegister = Memory.resourceSourceMap[resourceType].find(name => name == this.name)
        // 如果已经被添加过了就返回 false
        if (alreadyRegister) return false

        Memory.resourceSourceMap[resourceType].push(this.name)
        return true
    }

    /**
     * 从资源来源表中移除本房间房间
     * 
     * @param resourceType 从哪种资源类型中移除
     */
    public shareRemoveSource(resourceType: ResourceConstant): void {
        // 没有该资源就直接停止
        if (!(resourceType in Memory.resourceSourceMap)) return 

        // 获取该房间在资源来源表中的索引
        _.pull(Memory.resourceSourceMap[resourceType], this.name)
        // 列表为空了就直接移除
        if (Memory.resourceSourceMap[resourceType].length <= 0) delete Memory.resourceSourceMap[resourceType]
    }

    /**
     * 向本房间添加资源共享任务
     * 
     * @param targetRoom 资源发送到的房间
     * @param resourceType 共享资源类型
     * @param amount 共享资源数量
     * @returns 是否成功添加
     */
    public shareAdd(targetRoom: string, resourceType: ResourceConstant, amount: number): boolean {
        if (this.memory.shareTask) return false

        this.memory.shareTask = {
            target: targetRoom,
            resourceType,
            amount
        }
        return true
    }

    /**
     * 根据资源类型查找来源房间
     * 
     * @param resourceType 要查找的资源类型
     * @param amount 请求的数量
     * @returns 找到的目标房间，没找到返回 null
     */
    private shareGetSource(resourceType: ResourceConstant, amount: number): Room | null {
        // 兜底
        if (!Memory.resourceSourceMap) {
            Memory.resourceSourceMap = {}
            return null
        }
        const SourceRoomsName = Memory.resourceSourceMap[resourceType]
        if (!SourceRoomsName) return null

        // 寻找合适的房间
        let targetRoom: Room = null
        // 变量房间名数组，注意，这里会把所有无法访问的房间筛选出来
        let roomWithEmpty = SourceRoomsName.map(roomName => {
            const room = Game.rooms[roomName]
            if (!room || !room.terminal) return ''

            // 如果该房间当前没有任务，就选择其为目标
            if (!room.memory.shareTask && (room.name != this.name)) {
                // 如果请求共享的是能量，并且房间内 storage 低于上限的话，就从资源提供列表中移除该房间
                if (resourceType === RESOURCE_ENERGY && room.storage && room.storage.store[RESOURCE_ENERGY] < ENERGY_SHARE_LIMIT) return ''
                // 如果请求的资源不够的话就搜索下一个房间
                if (room.terminal.store[resourceType] < amount) return roomName
                
                // 接受任务的房间就是你了！
                targetRoom = room
            }
            
            return roomName
        })

        // 把上面筛选出来的空字符串元素去除
        Memory.resourceSourceMap[resourceType] = roomWithEmpty.filter(roomName => roomName)
        return targetRoom
    }

    /**
     * 初始化房间中的 lab 集群
     * 要提前放好名字为 lab1 和 lab2 的两个旗帜（放在集群中间的两个 lab 上）
     */
    private initLab(): string {
        /**
         * 获取旗帜及兜底
         * @danger 这里包含魔法常量，若有需要应改写成数组形式
         */
        const lab1Flag = Game.flags['lab1']
        const lab2Flag = Game.flags['lab2']
        if (!lab1Flag || !lab2Flag) return `[lab 集群] 初始化失败，请新建名为 [lab1] 和 [lab2] 的旗帜`
        if (lab1Flag.pos.roomName != this.name || lab2Flag.pos.roomName != this.name) return `[lab 集群] 初始化失败，旗帜不在本房间内，请进行检查`

        // 初始化内存, 之前有就刷新 id 缓存，没有就新建
        if (this.memory.lab) {
            this.memory.lab.inLab = []
            this.memory.lab.outLab = {}
        }
        else {
            this.memory.lab = {
                state: 'getTarget',
                targetIndex: 1,
                inLab: [],
                outLab: {},
                pause: false
            }
        }

        // 获取并分配 lab
        const labs = this.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType == STRUCTURE_LAB
        })
        labs.forEach(lab => {
            if (lab.pos.isEqualTo(lab1Flag.pos) || lab.pos.isEqualTo(lab2Flag.pos)) this.memory.lab.inLab.push(lab.id)
            else this.memory.lab.outLab[lab.id] = 0
        })

        lab1Flag.remove()
        lab2Flag.remove()

        return `[${this.name} lab] 初始化成功`
    }

    /**
     * 暂停 lab 集群工作
     */
    private pauseLab(): string {
        if (!this.memory.lab) return `[${this.name} lab] 集群尚未初始化`
        this.memory.lab.pause = true
        return `[${this.name} lab] 已暂停工作`
    }
    
    /**
     * 重启 lab 集群工作
     */
    private resumeLab(): string {
        if (!this.memory.lab) return `[${this.name} lab] 集群尚未初始化`
        this.memory.lab.pause = false
        return `[${this.name} lab] 已恢复工作`
    }

    /**
     * 用户操作：初始化 lab 集群
     */
    public linit(): string { return this.initLab() }

    /**
     * 用户操作：暂停 lab 集群
     */
    public loff(): string { return this.pauseLab() }

    /**
     * 用户操作：重启 lab 集群
     */
    public lon(): string { return this.resumeLab() }

    /**
     * 切换为战争状态
     * 需要提前插好名为 [房间名 + Boost] 的旗帜，并保证其周围有足够数量的 lab
     * 
     * @param boostType 以什么形式启动战争状态
     * @returns ERR_NAME_EXISTS 已经处于战争状态
     * @returns ERR_NOT_FOUND 未找到强化旗帜
     * @returns ERR_INVALID_TARGET 强化旗帜附近的lab数量不足
     */
    public startWar(boostType: BoostType): OK | ERR_NAME_EXISTS | ERR_NOT_FOUND | ERR_INVALID_TARGET {
        if (this.memory.war) return ERR_NAME_EXISTS

        // 获取 boost 旗帜
        const boostFlagName = this.name + 'Boost'
        const boostFlag = Game.flags[boostFlagName]
        if (!boostFlag) return ERR_NOT_FOUND

        // 获取执行强化的 lab
        const labs = boostFlag.pos.findInRange<StructureLab>(FIND_STRUCTURES, 1, {
            filter: s => s.structureType == STRUCTURE_LAB
        })
        // 如果 lab 数量不够
        if (labs.length < BOOST_RESOURCE[boostType].length) return ERR_INVALID_TARGET

        // 初始化 boost 任务
        let boostTask: BoostTask = {
            state: 'boostGet',
            pos: [ boostFlag.pos.x, boostFlag.pos.y ],
            type: boostType,
            lab: {}
        }

        // 统计需要执行强化工作的 lab 并保存到内存
        BOOST_RESOURCE[boostType].forEach(res => boostTask.lab[res] = labs.pop().id)

        // 发布 boost 任务
        this.memory.boost = boostTask
        this.memory.war = {}
        return OK
    }

    /**
     * 用户操作 - 启动战争状态
     */
    public war(): string {
        let stats = `[${this.name}] `
        const result = this.startWar('WAR')

        if (result === OK) stats += `已启动战争状态，正在准备 boost 材料，请在准备完成后再发布角色组`
        else if (result === ERR_NAME_EXISTS) stats += '已处于战争状态'
        else if (result === ERR_NOT_FOUND) stats += `未找到名为 [${this.name}Boost] 的旗帜，请保证其周围有足够数量的 lab（至少 5 个）`
        else if (result === ERR_INVALID_TARGET) stats += '旗帜周围的 lab 数量不足，请移动旗帜位置'

        return stats
    }

    /**
     * 强化指定 creep
     * 
     * @param creep 要进行强化的 creep，该 creep 应站在指定好的强化位置上
     * @returns ERR_NOT_FOUND 未找到boost任务
     * @returns ERR_BUSY boost尚未准备完成
     * @returns ERR_NOT_IN_RANGE creep不在强化位置上
     */
    public boostCreep(creep: Creep): OK | ERR_NOT_FOUND | ERR_BUSY | ERR_NOT_IN_RANGE {
        if (!this.memory.boost) return ERR_NOT_FOUND

        // 检查是否准备好了
        if (this.memory.boost.state != 'waitBoost') return ERR_BUSY

        // 获取全部 lab
        let executiveLab: StructureLab[] = []
        for (const resourceType in this.memory.boost.lab) {
            const lab = Game.getObjectById<StructureLab>(this.memory.boost.lab[resourceType])
            // 这里没有直接终止进程是为了避免 lab 集群已经部分被摧毁而导致整个 boost 进程无法执行
            if (lab) executiveLab.push(lab)
        }

        // 执行强化
        const boostResults = executiveLab.map(lab => lab.boostCreep(creep))
        
        // 有一个强化成功了就算强化成功
        if (boostResults.includes(OK)) {
            // 强化成功了就发布资源填充任务是因为
            // 在方法返回 OK 时，还没有进行 boost（将在 tick 末进行），所以这里检查资源并不会发现有资源减少
            // 为了提高存储量，这里直接发布任务，交给 transfer 在处理任务时检查是否有资源不足的情况
            this.addRoomTransferTask({
                type: ROOM_TRANSFER_TASK.BOOST_GET_RESOURCE
            })
            this.addRoomTransferTask({
                type: ROOM_TRANSFER_TASK.BOOST_GET_ENERGY
            })
        
            return OK
        }
        else return ERR_NOT_IN_RANGE
    }

    /**
     * 解除战争状态
     * 会同步取消 boost 进程
     */
    public stopWar(): OK | ERR_NOT_FOUND {
        if (!this.memory.war) return ERR_NOT_FOUND

        // 将 boost 状态置为 clear，labExtension 会自动发布清理任务并移除 boostTask
        if (this.memory.boost) this.memory.boost.state = 'boostClear'
        delete this.memory.war

        return OK
    }

    /**
     * 用户操作 - 取消战争状态
     */
    public nowar(): string {
        let stats = `[${this.name}] `
        const result = this.stopWar()

        if (result === OK) stats += `已解除战争状态，boost 强化材料会依次运回 Terminal`
        else if (result === ERR_NOT_FOUND) stats += `未启动战争状态`

        return stats
    }

    /**
     * 拓展新的外矿
     * 
     * @param remoteRoomName 要拓展的外矿房间名
     * @param targetId 能量搬到哪个建筑里
     * @returns ERR_INVALID_TARGET targetId 找不到对应的建筑
     * @returns ERR_NOT_FOUND 没有找到足够的 source 旗帜
     */
    public addRemote(remoteRoomName: string, targetId: string): OK | ERR_INVALID_TARGET | ERR_NOT_FOUND {
        // target 建筑一定要有
        if (!Game.getObjectById(targetId)) return ERR_INVALID_TARGET
        // 目标 source 也至少要有一个
        const sourceFlagsName = [ `${remoteRoomName} source0`, `${remoteRoomName} source1` ]
        if (!(sourceFlagsName[0] in Game.flags)) return ERR_NOT_FOUND
        // 兜底
        if (!this.memory.remote) this.memory.remote = {}

        // 添加对应的键值对
        this.memory.remote[remoteRoomName] = { targetId }

        this.addRemoteCreepGroup(remoteRoomName)
        return OK
    }

    /**
     * 用户操作 - 拓展新外矿
     * 
     * @param 同上 addRemote()
     */
    public radd(remoteRoomName: string, targetId: string): string {
        let stats = `[${this.name} 外矿] `

        const actionResult = this.addRemote(remoteRoomName, targetId)
        if (actionResult === OK) stats += '拓展完成，已发布 remoteHarvester 及 reserver'
        else if (actionResult === ERR_INVALID_TARGET) stats += '拓展失败，无效的 targetId'
        else if (actionResult === ERR_NOT_FOUND) stats += `拓展失败，未找到 source 旗帜，请在外矿房间的 source 上放置名为 [${remoteRoomName} source0] 的旗帜（有多个 source 请依次增加旗帜名最后一位的编号）`
        
        return stats
    }

    /**
     * 移除外矿
     * 
     * @param remoteRoomName 要移除的外矿
     * @param removeFlag 是否移除外矿的 source 旗帜
     */
    public removeRemote(remoteRoomName: string, removeFlag: boolean = false): OK | ERR_NOT_FOUND {
        // 兜底
        if (!this.memory.remote) return ERR_NOT_FOUND
        if (!(remoteRoomName in this.memory.remote)) return ERR_NOT_FOUND
        
        delete this.memory.remote[remoteRoomName]
        if (Object.keys(this.memory.remote).length <= 0) delete this.memory.remote

        const sourceFlagsName = [ `${remoteRoomName} source0`, `${remoteRoomName} source1` ]
        // 移除对应的旗帜和外矿采集单位
        sourceFlagsName.forEach((flagName, index) => {
            if (!(flagName in Game.flags)) return

            if (removeFlag) Game.flags[flagName].remove()
            creepApi.remove(`${remoteRoomName} remoteHarvester${index}`)
        })

        // 移除预定者
        creepApi.remove(`${remoteRoomName} reserver`)

        return OK
    }

    /**
     * 用户操作 - 移除外矿
     * 
     * @param 同上 removeRemote()
     */
    public rremove(remoteRoomName: string, removeFlag: boolean = false): string {
        let stats = `[${this.name} 外矿] `

        const actionResult = this.removeRemote(remoteRoomName, removeFlag)
        if (actionResult === OK) stats += '外矿及对应角色组已移除，' + (removeFlag ? 'source 旗帜也被移除' : 'source 旗帜未移除')
        else if (actionResult === ERR_NOT_FOUND) stats += '未找到对应外矿'
        
        return stats
    }

    /**
     * 占领新房间
     * 本方法只会发布占领单位，等到占领成功后 claimer 会自己发布支援单位
     * 
     * @param targetRoomName 要占领的目标房间
     * @param signText 新房间的签名
     */
    public claimRoom(targetRoomName: string, signText: string = ''): OK {
        creepApi.add(`${targetRoomName} Claimer`, 'claimer', {
            targetRoomName,
            spawnRoom: this.name,
            signText
        }, this.name)

        return OK
    }

    /**
     * 用户操作 - 占领新房间
     * 
     * @param 同上 claimRoom()
     */
    public claim(targetRoomName: string, signText: string = ''): string {
        this.claimRoom(targetRoomName, signText)

        return `[${this.name} 拓展] 已发布 claimer，请保持关注，支援单位会在占领成功后自动发布`
    }

    /**
     * 创建订单并返回创建信息
     * 
     * @param type 订单类型
     * @param resourceType 资源类型
     * @param price 单价
     * @param totalAmount 总量
     */
    private createOrder(type: ORDER_BUY | ORDER_SELL, resourceType: ResourceConstant, price: number, totalAmount: number): string {
        const orderConfig = {
            type: type,
            resourceType,
            price,
            totalAmount,
            roomName: this.name
        }
        const createResult = Game.market.createOrder(orderConfig)

        let returnString: string = ''
        // 新创建的订单下个 tick 才能看到，所以这里只能让玩家自行查看
        if (createResult === OK) returnString = `[${this.name}] ${type} 订单创建成功，使用如下命令来查询新订单:\n   JSON.stringify(_.find(Object.values(Game.market.orders),{type:'${type}',resourceType:'${resourceType}',price:${price},roomName:'${this.name}'}), null, 4)`
        else if (createResult === ERR_NOT_ENOUGH_RESOURCES) returnString = `[${this.name}] 您没有足够的 credit 来缴纳费用，当前/需要 ${Game.market.credits}/${price * totalAmount * 0.05}`
        else returnString = `[${this.name}] 创建失败，Game.market.createOrder 错误码: ${createResult}`

        return returnString
    }

    // private deal(orderId: string, amount?: number) {
    //     const order = Game.market.getOrderById(orderId)
    //     if (!order) return `[${this.name} terminal] 找不到订单 ${orderId}`

    //     if (!amount) amount = order.amount
    // }

    /**
     * 为该房间创建一个 ORDER_BUY 订单
     * 
     * @param resourceType 资源类型
     * @param price 单价
     * @param amount 总量
     */
    public buy(resourceType: ResourceConstant, price: number, totalAmount: number): string {
        return this.createOrder(ORDER_BUY, resourceType, price, totalAmount)
    }

    /**
     * 为该房间创建一个 ORDER_SELL 订单
     * 
     * @param resourceType 资源类型
     * @param price 单价
     * @param amount 总量
     */
    public sell(resourceType: ResourceConstant, price: number, totalAmount: number): string {
        return this.createOrder(ORDER_SELL, resourceType, price, totalAmount)
    }

    /**
     * 用户操作 - 查看如何孵化进攻型单位
     */
    public whelp(): string {
        return createHelp([
            {
                title: '进入战争状态，会同步启动 boost 进程',
                functionName: 'war'
            },
            {
                title: '解除战争状态并回收 boost 材料',
                functionName: 'nowar'
            },
            {
                title: '孵化基础进攻单位',
                params: [
                    { name: 'targetFlagName', desc: `[可选] 进攻旗帜名称，默认为 ${DEFAULT_FLAG_NAME.ATTACK}` },
                    { name: 'num', desc: '[可选] 要孵化的数量，1 - 10，默认为 1' }
                ],
                functionName: 'spwanSoldier'
            },
            {
                title: '<需要战争状态> 孵化 boost 进攻一体机',
                params: [
                    { name: 'bearTowerNum', desc: '[可选] 抗塔等级 0-6，等级越高扛伤能力越强，伤害越低，默认为 6' },
                    { name: 'targetFlagName', desc: `[可选] 进攻旗帜名称，默认为 ${DEFAULT_FLAG_NAME.ATTACK}` },
                    { name: 'keepSpawn', desc: '[可选] 是否持续生成，置为 true 时可以执行 creepApi.remove("creepName") 来终止持续生成，默认为 false' },
                ],
                functionName: 'spawnRangedAttacker'
            },
            {
                title: '<需要战争状态> 孵化 boost 拆墙小组',
                params: [
                    { name: 'targetFlagName', desc: `[可选] 进攻旗帜名称，默认为 ${DEFAULT_FLAG_NAME.ATTACK}` },
                    { name: 'keepSpawn', desc: '[可选] 是否持续生成，置为 true 时可以执行 creepApi.remove("creepName") 来终止持续生成，默认为 false' }
                ],
                functionName: 'spawnDismantleGroup'
            },
            {
                title: '孵化掠夺者',
                params: [
                    { name: 'sourceFlagName', desc: `[可选] 要搜刮的建筑上插好的旗帜名，默认为 ${DEFAULT_FLAG_NAME.REIVER}` },
                    { name: 'targetStructureId', desc: `[可选] 要把资源存放到的建筑 id，默认为房间终端` }
                ],
                functionName: 'spawnReiver'
            }
        ])
    }

    /**
     * 用户操作 - creep 发布
     */
    public shelp(): string {
        return createHelp([
            {
                title: '运行房间 creep 规划（默认由 controller 执行，如果发现房间没有孵化 creep 则可以手动执行）',
                functionName: 'planCreep'
            },
            {
                title: '添加额外的初始房间工作队伍（可加速初始房间升级速度）',
                params: [
                    { name: 'upgrader', desc: '[可选] 要添加的升级单位数量，默认为 5' },
                    { name: 'harvester', desc: '[可选] 要添加的填充单位数量，默认为 2' },
                ],
                functionName: 'addRise'
            },
            {
                title: '移除所有额外的初始房间工作队伍',
                functionName: 'removeRise'
            }
        ])
    }

    /**
     * 用户操作 - 房间操作帮助
     */
    public help(): string {
        return createHelp([
            {
                title: '添加中央运输任务',
                params: [
                    { name: 'targetType', desc: '资源存放建筑类型，STRUCTURE_FACTORY STRUCTURE_STORAGE STRUCTURE_TERMINAL 之一' },
                    { name: 'sourceType', desc: '资源来源建筑类型，同上' },
                    { name: 'resourceType', desc: '要转移的资源类型' },
                    { name: 'amount', desc: '要转移的数量' },
                ],
                functionName: 'ctadd'
            },
            {
                title: '向指定房间发送能量，注意，该操作会自动从 storage 里取出能量',
                params: [
                    { name: 'roomName', desc: '要发送到的房间名' },
                    { name: 'amount', desc: '[可选] 要转移的能量数量, 默认 100k' }
                ],
                functionName: 'givee'
            },
            {
                title: '向指定房间发送资源',
                params: [
                    { name: 'roomName', desc: '要发送到的房间名' },
                    { name: 'resourceType', desc: '要发送的资源类型' },
                    { name: 'amount', desc: '[可选] 要转移的能量数量, 默认 1k' }
                ],
                functionName: 'giver'
            },
            {
                title: '将能量从 storage 转移至 terminal 里',
                params: [
                    { name: 'amount', desc: '[可选] 要转移的能量数量, 默认 100k' }
                ],
                functionName: 'pute'
            },
            {
                title: '将能量从 terminal 转移至 storage 里',
                params: [
                    { name: 'amount', desc: '[可选] 要转移的能量数量, 默认 100k' }
                ],
                functionName: 'gete'
            },
            {
                title: 'factory.stats 的别名',
                functionName: 'fs'
            },
            {
                title: 'terminal.add 的别名',
                functionName: 'ta'
            },
            {
                title: 'terminal.remove 的别名',
                functionName: 'tr'
            },
            {
                title: 'terminal.show 的别名',
                functionName: 'ts'
            },
            {
                title: '给该房间新增 BUY 单',
                params: [
                    { name: 'resourceType', desc: '要购买的资源类型' },
                    { name: 'price', desc: '单价' },
                    { name: 'totalAmount', desc: '总量' },
                ],
                functionName: 'buy'
            },
            {
                title: '给该房间新增 SELL 单',
                params: [
                    { name: 'resourceType', desc: '要卖出的资源类型' },
                    { name: 'price', desc: '单价' },
                    { name: 'totalAmount', desc: '总量' },
                ],
                functionName: 'sell'
            },
            {
                title: '拍下订单',
                params: [
                    { name: 'id', desc: '订单 id' },
                    { name: 'amount', desc: '[可选] 交易数量，默认为全部' }
                ],
                functionName: 'deal'
            },
            {
                title: '拓展新外矿',
                params: [
                    { name: 'remoteRoomName', desc: '要拓展的外矿房间名' },
                    { name: 'targetId', desc: '能量应搬运到哪个建筑的 id' }
                ],
                functionName: 'radd'
            },
            {
                title: '移除外矿',
                params: [
                    { name: 'remoteRoomName', desc: '要移除的外矿房间名' },
                    { name: 'removeFlag', desc: '是否顺便把外矿 source 上的旗帜也移除了' }
                ],
                functionName: 'rremove'
            },
            {
                title: '占领新房间',
                params: [
                    { name: 'targetRoomName', desc: '要占领的房间名' },
                    { name: 'signText', desc: '[可选] 新房间的签名，默认为空' },
                ],
                functionName: 'claim'
            },
            {
                title: '给本房间签名',
                params: [
                    { name: 'content', desc: '要签名的内容' }
                ],
                functionName: 'sign'
            },
            {
                title: '初始化 lab 集群',
                functionName: 'linit'
            },
            {
                title: '暂停 lab 集群',
                functionName: 'loff'
            },
            {
                title: '重启 lab 集群',
                functionName: 'lon'
            },
            {
                title: '查看战争帮助',
                functionName: 'whelp'
            },
            {
                title: '查看 creep 发布帮助',
                functionName: 'shelp'
            }
        ])
    }
}

/**
 * 房间位置拓展
 */
class PositionExtension extends RoomPosition {
    /**
     * 获取当前位置目标方向的 pos 对象
     * 
     * @param direction 目标方向
     */
    public directionToPos(direction: DirectionConstant): RoomPosition | undefined {
        let targetX = this.x
        let targetY = this.y

        // 纵轴移动，方向朝下就 y ++，否则就 y --
        if (direction !== LEFT && direction !== RIGHT) {
            if (direction > LEFT || direction < RIGHT) targetY --
            else targetY ++
        }
        // 横轴移动，方向朝右就 x ++，否则就 x --
        if (direction !== TOP && direction !== BOTTOM) {
            if (direction < BOTTOM) targetX ++
            else targetX --
        }

        // 如果要移动到另一个房间的话就返回空，否则返回目标 pos
        if (targetX < 0 || targetY > 49 || targetX > 49 || targetY < 0) return undefined
        else return new RoomPosition(targetX, targetY, this.roomName)
    }

    /**
     * 获取该位置周围的开采位数量
     */
    public getFreeSpace(): number {
        let freeSpaceCount = 0
        const terrain = Game.map.getRoomTerrain(this.roomName)
        
        const xs = [this.x - 1, this.x, this.x + 1]
        const ys = [this.y - 1, this.y, this.y + 1]
        
        // 遍历 x 和 y 坐标
        xs.forEach(x => ys.forEach(y => {
            // 如果不是墙则 ++
            if (terrain.get(x, y) != TERRAIN_MASK_WALL) freeSpaceCount++
        }))
        
        return freeSpaceCount
    }
}