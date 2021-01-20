/**
 * 房间中央物流 - 资源转移任务
 */
interface CenterTransportTask {
    /**
     * 任务提交者类型
     * number 类型是为了运行玩家自己推送中央任务
     */
    submit: CenterStructures | number
    /**
     * 资源的提供建筑类型
     */
    source: CenterStructures
    /**
     * 资源的接受建筑类型
     */
    target: CenterStructures
    /**
     * 资源类型
     */
    resourceType:  ResourceConstant
    /**
     * 资源数量
     */
    amount: number
}

interface RoomMemory {
    /**
     * 中央集群的资源转移任务队列
     */
    centerTasks: CenterTransportTask[]
}

/**
 * 核心建筑群包含的建筑
 */
type CenterStructures = STRUCTURE_STORAGE | STRUCTURE_TERMINAL | STRUCTURE_FACTORY | 'centerLink'

interface InterfaceCenterTaskController {
    /**
     * 当前的中央物流任务
     */
    tasks: CenterTransportTask[]
    /**
     * 添加任务
     * 
     * @param task 要提交的任务
     * @param priority 任务优先级位置，默认追加到队列末尾。例：该值为 0 时将无视队列长度直接将任务插入到第一个位置
     * @returns 任务的排队位置, 0 是最前面，负数为添加失败，-1 为已有同种任务,-2 为目标建筑无法容纳任务数量
     */
    addTask(task: CenterTransportTask, priority?: number): number
    /**
     * 每个建筑同时只能提交一个任务
     * 
     * @param submit 提交者的身份
     * @returns 是否有该任务
     */
    hasTask(submit: CenterStructures | number): boolean
    /**
     * 暂时挂起当前任务
     * 会将任务放置在队列末尾
     * 
     * @returns 任务的排队位置, 0 是最前面
     */
    hangTask(): number
    /**
     * 获取中央队列中第一个任务信息
     * 
     * @returns 有任务返回任务, 没有返回 null
     */
    getTask(): CenterTransportTask | undefined
    /**
     * 处理任务
     * 
     * @param submitId 提交者的 id
     * @param transferAmount 本次转移的数量
     */
    handleTask(transferAmount: number): void
    /**
     * 移除当前中央运输任务
     */
    deleteCurrentTask(): void
}

interface Room {
    /**
     * 处理本房间的中央物流任务
     */
    centerTransport: InterfaceCenterTaskController
}