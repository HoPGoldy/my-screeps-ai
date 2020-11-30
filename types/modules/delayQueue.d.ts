/**
 * 延迟任务的数据
 */
interface DelayTaskData {
    /**
     * 必须为延迟任务分配一个房间名
     * 执行回调时会自动将其转换为房间对象
     */
    roomName: string
}

/**
 * 所有延迟任务的名称和数据的对应 map
 */
interface DelayTaskTypes {
    /**
     * 维修工延迟孵化任务
     */
    spawnRepairer: DelayTaskData
    /**
     * 挖矿工延迟孵化任务
     */
    spawnMiner: DelayTaskData
}

/**
 * 所有延迟任务的名字
 */
type AllDelayTaskName = keyof DelayTaskTypes

/**
 * 延迟任务的回调
 * 
 * @param data 任务的数据
 * @param room 该任务对应的房间对象，由数据中的 roomName 获取
 */
type DelayTaskCallback<K extends AllDelayTaskName> = (room: Room | undefined, data: DelayTaskTypes[K]) => void

interface DelayTaskMemory {
    /**
     * 该任务被调用的 Game.time
     */
    call: number
    /**
     * 被 JSON.stringify 压缩成字符串的任务数据，其值为任务名 + 空格 + 任务数据
     */
    data: string
}