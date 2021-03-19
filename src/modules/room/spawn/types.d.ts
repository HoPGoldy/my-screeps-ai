/**
 * 房间内存
 */
interface RoomMemory {
    /**
     * 该房间的孵化队列数据
     */
    spawnList: string
}

/**
 * 当 creep 不需要生成时 mySpawnCreep 返回的值
 */
type CREEP_DONT_NEED_SPAWN = -101

/**
 * spawn.mySpawnCreep 方法的返回值集合
 */
type MySpawnReturnCode = ScreepsReturnCode | CREEP_DONT_NEED_SPAWN