const SAVE_KEY = 'centerTasks'

export default class RoomCenterTaskController implements InterfaceCenterTaskController {
    readonly roomName: string

    constructor(roomName: string) {
        this.roomName = roomName
    }

    public get tasks(): CenterTransportTask[] {
        if (!Memory.rooms) Memory.rooms = {}
        if (!Memory.rooms[this.roomName][SAVE_KEY]) Memory.rooms[this.roomName][SAVE_KEY] = []
        
        return Memory.rooms[this.roomName][SAVE_KEY]
    }

    /**
     * 添加任务
     * 
     * @param task 要提交的任务
     * @param priority 任务优先级位置，默认追加到队列末尾。例：该值为 0 时将无视队列长度直接将任务插入到第一个位置
     * @returns 任务的排队位置, 0 是最前面，负数为添加失败，-1 为已有同种任务,-2 为目标建筑无法容纳任务数量
     */
    public addTask(task: CenterTransportTask, priority: number = null): number {
        if (this.hasTask(task.submit)) return -1
        // 由于这里的目标建筑限制型和非限制型存储都有，这里一律作为非限制性检查来减少代码量
        if (this[task.target] && (this[task.target].store as StoreDefinitionUnlimited).getFreeCapacity(task.resourceType) < task.amount) return -2

        if (!priority) this.tasks.push(task)
        else this.tasks.splice(priority, 0, task)

        return this.tasks.length - 1
    }

    /**
     * 每个建筑同时只能提交一个任务
     * 
     * @param submit 提交者的身份
     * @returns 是否有该任务
     */
    public hasTask(submit: CenterStructures | number): boolean {
        const task = this.tasks.find(task => task.submit === submit)
        return task ? true : false
    }

    /**
     * 暂时挂起当前任务
     * 会将任务放置在队列末尾
     * 
     * @returns 任务的排队位置, 0 是最前面
     */
    public hangTask(): number {
        this.tasks.push(this.tasks.shift())
        return this.tasks.length - 1
    }

    /**
     * 获取中央队列中第一个任务信息
     * 
     * @returns 有任务返回任务, 没有返回 null
     */
    public getTask(): CenterTransportTask | undefined {
        return this.tasks[0]
    }

    /**
     * 处理任务
     * 
     * @param submitId 提交者的 id
     * @param transferAmount 本次转移的数量
     */
    public handleTask(transferAmount: number): void {
        this.tasks[0].amount -= transferAmount
        if (this.tasks[0].amount <= 0) {
            this.deleteCurrentTask()
        }
    }

    /**
     * 移除当前中央运输任务
     */
    public deleteCurrentTask(): void {
        this.tasks.shift()
    }
}