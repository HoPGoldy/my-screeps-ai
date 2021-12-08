import { EnvContext } from '@/utils'
import { TransportRequest } from '../taskTransport/types'

export type ShareContext = {
    /**
     * 返回全局的资源来源表
     */
    getGlobalMemory: () => ResourceSourceMap
    /**
     * 获取资源共享相关内存
     */
    getMemory: (room: Room) => RoomShareTask
    /**
     * 清空相关内存
     */
    clearMemory: (room: Room) => unknown
    /**
     * 获取房间中某样资源的数量
     */
    getRoomRes: (room: Room, resType: ResourceConstant) => number
    /**
     * 是否存在 share 物流任务
     */
    hasTransportTask: (room: Room) => boolean
    /**
     * 添加 share 物流任务
     */
    addTransportTask: (room: Room, requests: TransportRequest[]) => unknown
} & EnvContext

/**
 * 房间要执行的资源共享任务
 * 和上面的资源共享任务的不同之处在于，该任务是发布在指定房间上的，所以不需要 source
 */
export interface RoomShareTask {
    /**
     * 资源的接受房间
     */
    target?: string
    /**
     * 共享的资源类型
     */
    resourceType?: ResourceConstant,
    /**
     * 期望数量
     */
    amount?: number
}

/**
 * 资源来源表
 * 资源类型为键，房间名列表为值
 */
export type ResourceSourceMap = {
    [resourceType in ResourceConstant]?: string[]
}
