import { createHelp } from './utils'

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
     * @returns 任务的排队位置, 0 是最前面
     */
    public addTask(task: ITransferTask): number {
        if (this.hasTask(task.submitId)) return -1

        this.memory.centerTransferTasks.push(task)
        return this.memory.centerTransferTasks.length - 1
    }

    /**
     * 用户操作：addTask - 添加中央运输任务
     * 
     * @param targetId 资源存放建筑 id
     * @param sourceId 资源来源建筑 id
     * @param resourceType 要转移的资源类型
     * @param amount 资源数量
     */
    public ctadd(targetId: string, sourceId: string, resourceType: ResourceConstant, amount: number) {
        if (!this.memory.centerTransferTasks) this.memory.centerTransferTasks = []
        this.addTask({
            submitId: this.memory.centerTransferTasks.length.toString(),
            targetId,
            sourceId,
            resourceType,
            amount
        })
    }

    /**
     * 每个建筑同时只能提交一个任务
     * 
     * @param submitId 提交者的 id
     * @returns 是否有该任务
     */
    public hasTask(submitId: string): boolean {
        if (!this.memory.centerTransferTasks) this.memory.centerTransferTasks = []
        
        const task = this.memory.centerTransferTasks.find(task => task.submitId === submitId)
        return task ? true : false
    }

    /**
     * 暂时挂起当前任务
     * 会将任务暂时放置在队列末尾
     * 
     * @returns 任务的排队位置, 0 是最前面
     */
    public hangTask(): number {
        const task = this.memory.centerTransferTasks.shift()
        this.memory.centerTransferTasks.push(task)

        return this.memory.centerTransferTasks.length - 1
    }

    /**
     * 获取队列中第一个任务信息
     * 
     * @returns 有任务返回任务, 没有返回 null
     */
    public getTask(): ITransferTask | null {
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
     * @param submitId 提交者的 id
     * @param transferAmount 本次转移的数量
     */
    public handleTask(transferAmount: number): void {
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
     */
    public addTerminalTask(resourceType: ResourceConstant, amount: number): string {
        if (!this.memory.terminalTasks) this.memory.terminalTasks = {}

        this.memory.terminalTasks[resourceType] = amount
        return `已添加，当前监听任务如下: \n ${this.showTerminalTask()}`
    }

    /**
     * 用户操作：addTerminalTask
     */
    public tadd(resourceType: ResourceConstant, amount: number): string { return this.addTerminalTask(resourceType, amount) }

    /**
     * 移除终端矿物监控
     * 
     * @param resourceType 要停止监控的资源类型
     */
    public removeTerminalTask(resourceType: ResourceConstant): string {
        if (!this.memory.terminalTasks) this.memory.terminalTasks = {}

        delete this.memory.terminalTasks[resourceType]
        return `已移除，当前监听任务如下: \n ${this.showTerminalTask()}`
    }

    /**
     * 用户操作：removeTerminalTask
     */
    public tremove(resourceType: ResourceConstant): string { return this.removeTerminalTask(resourceType) }

    /**
     * 显示所有终端监听任务
     */
    public showTerminalTask(): string {
        if (!this.memory.terminalTasks) this.memory.terminalTasks = {}
        if (!this.terminal) return '该房间还没有 Terminal'

        const resources = Object.keys(this.memory.terminalTasks)
        if (resources.length == 0) return '该房间暂无终端监听任务'
        
        return resources.map(res => `  ${res} 当前数量/期望数量: ${this.terminal.store[res]}/${this.memory.terminalTasks[res]}`).join('\n')
    }

    /**
     * 用户操作：showTerminalTask
     */
    public tshow(): string { return this.showTerminalTask() }

    /**
     * 房间操作帮助
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
                    { name: 'amount', desc: '指定类型的期望数量' }
                ],
                functionName: 'tadd'
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