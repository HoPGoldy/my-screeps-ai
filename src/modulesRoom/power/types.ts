/**
 * PowerCreep 内存拓展
 */
interface PowerCreepMemory {
    /**
     * 为 true 时执行 target，否则执行 source
     */
    working: boolean
    /**
     * 要添加 REGEN_SOURCE 的 souce 在 room.sources 中的索引值
     */
    sourceIndex?: number
}

interface RoomMemory {
    /**
     * power 任务请求队列
     * 由建筑物发布，powerCreep 查找任务时会优先读取该队列
     */
    powerTasks: PowerConstant[]
}
