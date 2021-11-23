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
        return OK
    },

    /**
     *  其他 shard 发来了 creep 的重新孵化任务
     */
    sendRespawn: ({ name, memory }) => {
        // 把要孵化的 creep 内存塞回 Memory.creeps
        // 然后就会被 creep 数量控制模块识别到并走正常的重生流程
        if (assertCreepMemory(memory)) Memory.creeps[name] = memory
        // 暂时没这个需求，以后再写
        else console.log('跨 shard powerCreep 请求孵化')

        return OK
    }
}

/**
 * 断言内存是否为 creep 的
 */
export const assertCreepMemory = function (memory: CreepMemory | PowerCreepMemory): memory is CreepMemory {
    return 'spawnRoom' in memory
}

export default requestHandleStrategies
