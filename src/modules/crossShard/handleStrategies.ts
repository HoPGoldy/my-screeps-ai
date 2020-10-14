import { handleNotExistCreep } from 'modules/creepController'

/**
 * 其他 shard 发来的请求的处理策略
 * 
 * 每种请求都必须存在对应的策略
 */
const requestHandleStrategies: CrossShardRequestStrategies = {
    /**
     * 其他 shard 发来了 creep
     */
    sendCreep: (data: SendCreepData) => {
        console.log('收到 sennCreep 任务', JSON.stringify(data))
        if (!Memory.creeps) Memory.creeps = {}

        // 把 creep 内存复制到自己 Memory 里
        Memory.creeps[data.name] = data.memory
        return OK
    },

    /**
     *  其他 shard 发来了 creep 的重新孵化任务
     */
    sendRespawn: (data: SendRespawnData) => {
        console.log('收到 sendRespawn 任务', JSON.stringify(data))
        handleNotExistCreep(data.name, data.memory)
        return OK
    }
}

export default requestHandleStrategies