/**
 * 目前官服存在的所有 shard 的名字
 */
type ShardName = 'shard0' | 'shard1' | 'shard2' | 'shard3'

interface Memory {
    /**
     * 从其他 shard 跳跃过来的 creep 内存会被存放在这里
     * 等 creep 抵达后在由其亲自放在 creepConfigs 里
     * 
     * 不能直接放在 creepConfigs
     * 因为有可能出现内存到了但是 creep 还没到的情况，这时候 creepController 就会以为这个 creep 死掉了从而直接把内存回收掉
     */
    crossShardCreeps: {
        [creepName: string]: MyCreepMemory
    }
}

interface Game {
    /**
     * 本 tick 是否需要执行保存 InterShardMemory
     */
    _needSaveInterShardData: boolean
}

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
        memory: MyCreepMemory
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
        memory: MyCreepMemory
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