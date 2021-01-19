/**
 * 当 creep 不需要生成时 mySpawnCreep 返回的值
 */
type CREEP_DONT_NEED_SPAWN = -101

/**
 * spawn.mySpawnCreep 方法的返回值集合
 */
type MySpawnReturnCode = ScreepsReturnCode | CREEP_DONT_NEED_SPAWN