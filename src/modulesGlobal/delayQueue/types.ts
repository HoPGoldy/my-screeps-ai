import { EnvContext } from '@/utils'

export type DelayQueueContext = {
    getMemory: () => DelayQueueMemory
} & EnvContext

/**
 * 延迟任务存储
 * 键为要执行的 tick，值为一个序列化的 DelayTask 数组
 */
export interface DelayQueueMemory {
    [callTime: number]: string
}

/**
 * 延迟任务的数据
 */
export interface DelayTaskData {
    roomName: string
}

/**
 * 延迟任务的回调
 *
 * @param data 任务的数据
 * @param room 该任务对应的房间对象，由数据中的 roomName 获取
 */
export type DelayCallback = (data: Record<string, any>) => unknown

/**
 * 延迟任务
 */
export interface DelayTask {
    /**
     * 延迟任务类型
     * 由此判断应该触发哪个回调
     */
    type: string
    /**
     * 延迟任务数据
     */
    data: Record<string, any>
}
