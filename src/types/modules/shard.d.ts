/**
 * 目前官服存在的所有 shard 的名字
 */
type ShardName = 'shard0' | 'shard1' | 'shard2' | 'shard3'

/**
 * 跨 shard 请求构造器
 */
interface CrossShardRequestConstructor<RequestType, RequestData> {
    /**
     * 要处理请求的 shard
     */
    to: ShardName,
    /**
     * 该请求的类型
     */
    type: RequestType,
    /**
     * 该请求携带的数据
     */
    data: RequestData
}

/**
 * 跨 shard 请求 - 发送 creep
 */
type SendCreep = 'sendCreep'
type SendCreepData = {
    /**
     * 要发送 creep 的名字
     */
    name: string
    /**
     * 要发送 creep 的内存
     */
    memory: CreepMemory
}

/**
 * 跨 shard 请求 - 提交重新孵化任务
 */
type SendRespawn = 'sendRespawn'
type SendRespawnData = {
    /**
     * 要重新孵化的 creep 的名字
     */
    name: string
    /**
     * 要重新孵化的 creep 的内存
     */
    memory: CreepMemory | PowerCreepMemory
}

/**
 * 构造所有的跨 shard 请求
 */
type CrossShardRequest = 
    CrossShardRequestConstructor<SendCreep, SendCreepData> |
    CrossShardRequestConstructor<SendRespawn, SendRespawnData>

/**
 * 所有跨 shard 请求的类型和数据
 */
type CrossShardRequestType = SendCreep | SendRespawn
type CrossShardRequestData = SendCreepData | SendRespawnData

/**
 * 所有跨 shard 请求的执行策略
 */
type CrossShardRequestStrategies = {
    [type in CrossShardRequestType]: (data: CrossShardRequestData) => ScreepsReturnCode
}

/**
 * 镜面的跨 shard 数据
 */
type InterShardData = {
    [shard in ShardName]?: {
        /**
         * 一个键值对构成了一个消息
         */
        [msgName: string]: CrossShardRequest | ScreepsReturnCode   
    }
}

/**
 * 跨 shard 响应
 */
interface CrossShardReply {
    /**
     * 响应是否存在
     */
    has: boolean,
    /**
     * 响应的状态
     */
    result?: ScreepsReturnCode
}

/**
 * 跨 shard 请求的元数据
 */
interface CrossShardRequestInfo {
    /**
     * 请求的发送 shard
     */
    source: ShardName,
    /**
     * 请求的名称
     */
    name: string
}