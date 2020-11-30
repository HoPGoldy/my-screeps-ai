/**
 * 目前官服存在的所有 shard 的名字
 */
type ShardName = 'shard0' | 'shard1' | 'shard2' | 'shard3'

/**
 * 跨 shard 请求构造器
 */
interface CrossShardRequestConstructor<K extends CrossShardRequestType> {
    /**
     * 要处理请求的 shard
     */
    to: ShardName,
    /**
     * 该请求的类型
     */
    type: K,
    /**
     * 该请求携带的数据
     */
    data: CrossShardDatas[K]
}

/**
 * 所有的跨 shard 数据（键为对应的信息 type）
 */
interface CrossShardDatas {
    /**
     * 跨 shard 请求 - 发送 creep
     */
    sendCreep: {
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
    sendRespawn: {
        /**
         * 要重新孵化的 creep 的名字
         */
        name: string
        /**
         * 要重新孵化的 creep 的内存
         */
        memory: CreepMemory | PowerCreepMemory
    }
}

/**
 * 所有的跨 shard 请求
 */
type CrossShardRequest = CrossShardRequestConstructor<CrossShardRequestType>

/**
 * 所有跨 shard 请求的类型
 */
type CrossShardRequestType = keyof CrossShardDatas

/**
 * 所有跨 shard 请求的执行策略
 */
type CrossShardRequestStrategies = {
    [type in CrossShardRequestType]: (data: CrossShardDatas[type]) => ScreepsReturnCode
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