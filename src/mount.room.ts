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
            this.memory.centerTransferTasks.shift()
        }
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
     * 读取房间内的工厂目标
     * 一般由本房间的工厂调用
     */
    public getFactoryTarget(): ResourceConstant | null {
        return this.memory.factoryTarget || null
    }

    /**
     * 清空本房间工厂目标
     */
    public clearFactoryTarget(): string {
        delete this.memory.factoryTarget
        return `${this.name} 工厂目标已清除`
    }
}