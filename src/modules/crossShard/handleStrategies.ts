import { handleNotExistCreep } from '@/modules/creepController/creepHandle'

/**
 * 其他 shard 发来的请求的处理策略
 * 
 * 每种请求都必须存在对应的策略
 */
const requestHandleStrategies: CrossShardRequestStrategies = {
    /**
     * 其他 shard 发来了 creep
     */
    sendCreep: data => {
        if (!Memory.crossShardCreeps) Memory.crossShardCreeps = {}

        // 把 creep 内存复制到暂存区里
        Memory.crossShardCreeps[data.name] = data.memory
        // console.log('Creep >', JSON.stringify(Memory.crossShardCreeps[data.name]))
        return OK
    },

    /**
     *  其他 shard 发来了 creep 的重新孵化任务
     */
    sendRespawn: data => {
        // console.log('Respawn >', JSON.stringify(data))
        handleNotExistCreep(data.name, data.memory)
        return OK
    }
}

export default requestHandleStrategies