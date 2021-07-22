/**
 * 房间中央物流 - 资源转移任务
 */
export interface CenterTransportTask {
    /**
     * 任务提交者类型
     * number 类型是为了运行玩家自己推送中央任务
     */
    submit: CenterStructure | number | string
    /**
     * 资源的提供建筑类型
     */
    source: CenterStructure
    /**
     * 资源的接受建筑类型
     */
    target: CenterStructure
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
 * 其中 drop 是指扔在地上，会在存储装满时添加此类型任务
 */
export type CenterStructures = STRUCTURE_STORAGE | STRUCTURE_TERMINAL | STRUCTURE_FACTORY | 'centerLink' | 'drop'

export enum CenterStructure {
    Storage = 'storage',
    Terminal = 'terminal',
    Factory = 'factory',
    Link = 'centerLink',
    Drop = 'drop'
}

declare global {
    interface RoomMemory {
        /**
         * 中央集群的资源转移任务队列
         */
        centerTasks: CenterTransportTask[]
    }
}