import RoomAccessor from "../RoomAccessor"
import { CenterStructures, CenterTransportTask } from "./types"

export default class RoomCenterTaskController extends RoomAccessor<CenterTransportTask[]> {
    constructor(roomName: string) {
        super('centerTask', roomName, 'centerTasks', [])
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

        if (!priority) this.memory.push(task)
        else this.memory.splice(priority, 0, task)

        return this.memory.length - 1
    }

    /**
     * addTask 的快捷方式
     * 
     * @param form 要从哪取资源
     * @param to 资源存放到哪
     * @param resourceType 要转移的资源
     * @param amount 要转移的数量
     * @param taskKey 唯一的任务 id，若该值和已存在的任务索引重复则不允许添加，默认为 to 参数的值
     */
    public send(
        form: CenterStructures,
        to: CenterStructures,
        resourceType: ResourceConstant,
        amount: number,
        taskKey?: number | string
    ): number {
        const submit = taskKey ? taskKey : to

        return this.addTask({
            submit,
            source: form,
            target: to,
            resourceType,
            amount
        })
    }

    /**
     * 获取该模块的任务列表
     */
    public get tasks(): CenterTransportTask[] {
        return this.memory
    }

    /**
     * 每个建筑同时只能提交一个任务
     * 
     * @param submit 提交者的身份
     * @returns 是否有该任务
     */
    public hasTask(submit: CenterStructures | number | string): boolean {
        const task = this.memory.find(task => task.submit === submit)
        return task ? true : false
    }

    /**
     * 暂时挂起当前任务
     * 会将任务放置在队列末尾
     * 
     * @returns 任务的排队位置, 0 是最前面
     */
    public hangTask(): number {
        this.memory.push(this.memory.shift())
        return this.memory.length - 1
    }

    /**
     * 获取中央队列中第一个任务信息
     * 
     * @returns 有任务返回任务, 没有返回 null
     */
    public getTask(): CenterTransportTask | undefined {
        return this.memory[0]
    }

    /**
     * 处理任务
     * 
     * @param submitId 提交者的 id
     * @param transferAmount 本次转移的数量
     */
    public handleTask(transferAmount: number): void {
        this.memory[0].amount -= transferAmount
        if (this.memory[0].amount <= 0) {
            this.deleteCurrentTask()
        }
    }

    /**
     * 移除当前中央运输任务
     */
    public deleteCurrentTask(): void {
        this.memory.shift()
    }
}