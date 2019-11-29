import { createHelp } from './utils'
import { ROOM_TRANSFER_TASK } from './roles.advanced'

// 挂载拓展到 Room 原型
export default function () {
    _.assign(Room.prototype, RoomExtension.prototype)
}

class RoomExtension extends Room {
    /**
     * 添加任务
     * 
     * @param submitId 提交者的 id 
     * @param task 要提交的任务
     * @returns 任务的排队位置, 0 是最前面，-1 为添加失败（已有同种任务）
     */
    public addCenterTask(task: ITransferTask): number {
        if (this.hasCenterTask(task.submitId)) return -1

        this.memory.centerTransferTasks.push(task)
        return this.memory.centerTransferTasks.length - 1
    }

    /**
     * 用户操作：addCenterTask - 添加中央运输任务
     * 
     * @param targetId 资源存放建筑 id
     * @param sourceId 资源来源建筑 id
     * @param resourceType 要转移的资源类型
     * @param amount 资源数量
     */
    public ctadd(targetId: string, sourceId: string, resourceType: ResourceConstant, amount: number): string {
        if (!this.memory.centerTransferTasks) this.memory.centerTransferTasks = []
        const addResult = this.addCenterTask({
            submitId: this.memory.centerTransferTasks.length.toString(),
            targetId,
            sourceId,
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
            submitId: this.memory.centerTransferTasks.length.toString(),
            targetId: this.terminal.id,
            sourceId: this.storage.id,
            resourceType: RESOURCE_ENERGY,
            amount
        })
        return `已向 ${this.name} 中央任务队列推送能量转移任务，storage > terminal, 数量 ${amount}，当前排队位置: ${addResult}`
    }

    /**
     * 用户操作：向指定房间发送能量
     * 注意，该操作会自动从 storage 里取出能量
     * 
     * @param roomName 目标房间名
     * @param amount 要发送的数量, 默认 100k
     */
    public givee(roomName: string, amount: number = 100000): string {
        // 计算路费，防止出现路费 + 资源超过终端上限的问题出现
        const cost = Game.market.calcTransactionCost(amount, this.name, roomName)
        if (amount + cost > TERMINAL_CAPACITY) {
            return `[能量共享] 添加共享任务失败，资源总量超出终端上限：发送数量(${amount}) + 路费(${cost}) = ${amount + cost}`
        }

        // 如果在执行其他任务则添加失败
        if (this.memory.shareTask) {
            const task = this.memory.shareTask
            return `[能量共享] 任务添加失败，当前房间正在执行其他共享任务，请稍后重试\n  ┖─ 当前执行的共享任务: 目标房间：${task.target} 资源类型：${task.resourceType} 资源总量：${task.amount}`
        }

        this.memory.shareTask = {
            target: roomName,
            amount,
            resourceType: RESOURCE_ENERGY
        }

        return `能量共享任务已填加，等待终端处理任务：房间名：${roomName} 共享数量：${amount} 路费：${cost}\n`
    }

    /**
     * 用户操作：将能量从 terminal 转移至 storage 里
     * 
     * @param amount 要转移的能量数量, 默认100k
     */
    public gete(amount: number = 100000): string {
        const addResult = this.addCenterTask({
            submitId: this.memory.centerTransferTasks.length.toString(),
            targetId: this.storage.id,
            sourceId: this.terminal.id,
            resourceType: RESOURCE_ENERGY,
            amount
        })
        return `已向 ${this.name} 中央任务队列推送能量转移任务，terminal > storage, 数量 ${amount}，当前排队位置: ${addResult}`
    }

    /**
     * 每个建筑同时只能提交一个任务
     * 
     * @param submitId 提交者的 id
     * @returns 是否有该任务
     */
    public hasCenterTask(submitId: string): boolean {
        if (!this.memory.centerTransferTasks) this.memory.centerTransferTasks = []
        
        const task = this.memory.centerTransferTasks.find(task => task.submitId === submitId)
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

        // console.log(`[物流任务] ${this.name} 添加任务 ${task.type}`)

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
     */
    public deleteCurrentRoomTransferTask(): void {
        this.memory.transferTasks.shift()
    }

    /**
     * 设置房间内的工厂目标
     * 
     * @param resourceType 工厂期望生成的商品
     */
    public setFactoryTarget(resourceType: ResourceConstant): string {
        this.memory.factoryTarget = resourceType
        return `${this.name} 工厂目标已被设置为 ${resourceType}`
    }

    /**
     * 用户操作：setFactoryTarget
     */
    public fset(resourceType: ResourceConstant): string { return this.setFactoryTarget(resourceType) }

    /**
     * 读取房间内的工厂目标
     * 一般由本房间的工厂调用
     */
    public getFactoryTarget(): ResourceConstant | null {
        return this.memory.factoryTarget || null
    }

    /**
     * 用户操作：getFactoryTarget
     */
    public fshow(): string {
        const resource = this.getFactoryTarget()
        return resource ? 
        `${this.name} 工厂目标为 ${resource}` :
        `${this.name} 工厂目标正处于空闲状态`
    }

    /**
     * 清空本房间工厂目标
     */
    public clearFactoryTarget(): string {
        delete this.memory.factoryTarget
        return `${this.name} 工厂目标已清除`
    }

    /**
     * 用户操作：clearFactoryTarget
     */
    public fclear(): string { return this.clearFactoryTarget() }

    /**
     * 添加终端矿物监控
     * 
     * @param resourceType 要监控的资源类型
     * @param amount 期望的资源数量
     * @param mod 监听的方式，包括
     *     @var max 只在资源超过期望值时触发卖出操作
     *     @var min 只在资源低于期望值时触发补充操作
     *     @var all 双向监听，包含上述两种（默认值）
     * @param supplementAction 从哪里补充资源
     *     @var market 市场（默认值）
     *     @var share 资源共享协议
     */
    public addTerminalTask(resourceType: ResourceConstant, amount: number, mod: string = 'all', supplementAction: string = 'market'): void {
        if (!this.memory.terminalTasks) this.memory.terminalTasks = {}

        this.memory.terminalTasks[resourceType] = { amount, mod, supplementAction }
    }

    /**
     * 用户操作：addTerminalTask
     */
    public tadd(resourceType: ResourceConstant, amount: number, mod: string = 'all', supplementAction: string = 'market'): string { 
        this.addTerminalTask(resourceType, amount, mod, supplementAction) 
        return `已添加，当前监听任务如下: \n${this.showTerminalTask()}`
    }

    /**
     * 移除终端矿物监控
     * 
     * @param resourceType 要停止监控的资源类型
     */
    public removeTerminalTask(resourceType: ResourceConstant): void {
        if (!this.memory.terminalTasks) this.memory.terminalTasks = {}

        delete this.memory.terminalTasks[resourceType]
    }

    /**
     * 用户操作：removeTerminalTask
     */
    public tremove(resourceType: ResourceConstant): string { 
        this.removeTerminalTask(resourceType) 
        return `已移除，当前监听任务如下:\n ${this.showTerminalTask()}`
    }

    /**
     * 用户操作：将终端监听设置为默认值
     */
    public treset(): string {
        // 模板任务
        const templateTask = {
            amount: 5000,
            mod: 'min',
            supplementAction: 'share'
        }
        // 重置任务
        this.memory.terminalTasks = {
            [RESOURCE_OXYGEN]: templateTask,
            [RESOURCE_HYDROGEN]: templateTask,
            [RESOURCE_KEANIUM]: templateTask,
            [RESOURCE_LEMERGIUM]: templateTask,
            [RESOURCE_ZYNTHIUM]: templateTask,
            [RESOURCE_UTRIUM]: templateTask,
            [RESOURCE_CATALYST]: templateTask
        }
        this.memory.terminalIndex = 0
        
        return `已重置，当前监听任务如下:\n${this.showTerminalTask()}`
    }

    /**
     * 显示所有终端监听任务
     */
    public showTerminalTask(): string {
        if (!this.memory.terminalTasks) this.memory.terminalTasks = {}
        if (!this.terminal) return '该房间还没有 Terminal'

        const resources = Object.keys(this.memory.terminalTasks)
        if (resources.length == 0) return '该房间暂无终端监听任务'

        return resources.map(res => {
            const task = this.memory.terminalTasks[res]
            let result = `${res} 当前数量/期望数量: ${this.terminal.store[res]}/${task.amount} 监听类型: ${task.mod}`
            if (task.mod == 'min') result += ` 资源来源: ${task.supplementAction}`
            return result
        }).join('\n')
    }

    /**
     * 用户操作：showTerminalTask
     */
    public tshow(): string { return this.showTerminalTask() }

    /**
     * 向其他房间请求资源共享
     * 
     * @param resourceType 请求的资源类型
     * @param amount 请求的数量
     */
    public shareRequest(resourceType: ResourceConstant, amount: number): boolean {
        const targetRoom = this.shareGetSource(resourceType)
        if (!targetRoom) return false

        const addResult = targetRoom.shareAdd(this.name, resourceType, amount)
        return addResult
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
     * @returns 找到的目标房间，没找到返回 null
     */
    private shareGetSource(resourceType: ResourceConstant): Room | null {
        // 兜底
        if (!Memory.resourceSourceMap) {
            Memory.resourceSourceMap = {}
            return null
        }
        const SourceRoomsName = Memory.resourceSourceMap[resourceType]
        if (!SourceRoomsName) return null

        // 寻找合适的房间
        let targetRoom: Room
        // console.log('来源表健全', SourceRoomsName)
        // 变量房间名数组，注意，这里会把所有无法访问的房间筛选出来
        let roomWithEmpty = SourceRoomsName.map(roomName => {
            const room = Game.rooms[roomName]
            if (!room) return ''
            // console.log(room.memory.shareTask, room.name, this.name)
            // 如果该房间当前没有任务，就选择其为目标
            if (!room.memory.shareTask && (room.name != this.name)) targetRoom = room
            return roomName
        })

        // 把上面筛选出来的空字符串元素去除
        Memory.resourceSourceMap[resourceType] = roomWithEmpty.filter(roomName => roomName)
        return targetRoom ? targetRoom : null
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
                outLabIndex: 0
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

        return `[lab 集群] ${this.name} 初始化成功`
    }

    /**
     * 用户操作：初始化 lab 集群
     */
    public linit(): string { return this.initLab() }

    /**
     * 用户操作：房间操作帮助
     */
    public help(): string {
        return createHelp([
            {
                title: '添加中央运输任务',
                params: [
                    { name: 'targetId', desc: '资源存放建筑 id' },
                    { name: 'sourceId', desc: '资源来源建筑 id' },
                    { name: 'resourceType', desc: '工厂要生产的资源类型' },
                    { name: 'amount', desc: '工厂要生产的资源类型' },
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
                title: '设置房间内工厂目标',
                params: [
                    { name: 'resourceType', desc: '工厂要生产的资源类型' }
                ],
                functionName: 'fset'
            },
            {
                title: '获取房间内工厂目标',
                functionName: 'fshow'
            },
            {
                title: '清空房间内工厂目标',
                functionName: 'fclear'
            },
            {
                title: '添加终端矿物监控',
                params: [
                    { name: 'resourceType', desc: '终端要监听的资源类型(只会监听自己库存中的数量)' },
                    { name: 'amount', desc: '指定类型的期望数量' },
                    { name: 'mod', desc: '[可选] 监听类型，分为 max, min, all(默认)' },
                    { name: 'supplementAction', desc: '[可选] 补货来源，分为 share, market(默认)'}
                ],
                functionName: 'tadd'
            },
            {
                title: '重设终端矿物监控',
                functionName: 'treset'
            },
            {
                title: '移除终端矿物监控',
                params: [
                    { name: 'resourceType', desc: '要移除监控的资源类型' }
                ],
                functionName: 'tremove'
            },
            {
                title: '显示所有终端监听任务',
                functionName: 'tshow'
            },
        ])
    }
}