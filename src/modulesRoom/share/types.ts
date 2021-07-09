/**
 * 房间要执行的资源共享任务
 * 和上面的资源共享任务的不同之处在于，该任务是发布在指定房间上的，所以不需要 source
 */
export interface RoomShareTask {
    /**
     * 资源的接受房间
     */
    target: string
    /**
     * 共享的资源类型
     */
    resourceType: ResourceConstant,
    /**
     * 期望数量
     */
    amount: number
}

/**
 * 资源来源表
 * 资源类型为键，房间名列表为值
 */
export type ResourceSourceMap = {
    [resourceType in ResourceConstant]?: string[]
}

declare global {
    interface RoomMemory {
        /**
         * 该房间要执行的资源共享任务
         */
        shareTask: RoomShareTask
    }

    interface Memory {
        resourceSourceMap: ResourceSourceMap,
    }
}