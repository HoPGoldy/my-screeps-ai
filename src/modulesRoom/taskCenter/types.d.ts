/**
 * 房间中央物流 - 资源转移任务
 */
export interface CenterTransportTask {
    /**
     * 任务提交者类型
     * number 类型是为了运行玩家自己推送中央任务
     */
    submit: CenterStructures | number | string
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

/**
 * 核心建筑群包含的建筑
 */
export type CenterStructures = STRUCTURE_STORAGE | STRUCTURE_TERMINAL | STRUCTURE_FACTORY | 'centerLink'

declare global {
    interface RoomMemory {
        /**
         * 中央集群的资源转移任务队列
         */
        centerTasks: CenterTransportTask[]
    }
}