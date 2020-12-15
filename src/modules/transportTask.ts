/**
 * 房间物流任务模块
 * 
 * 该模块处理房间中的物流任务，包括：spawn、extension、tower 能量填充，lab 运输等等
 * 但是该模块不负责中央集群的物流任务
 */

/**
 * 任务都将存储在这里
 */
const taskStorage = {}

/**
 * 从内存中初始化所有房间的任务
 */
const initTask = function () {}

/**
 * 给指定房间添加任务
 */
const addTask = function () {}

/**
 * 某个房间是否存在某任务
 */
const hasTask = function () {}

/**
 * creep 获取当前需要执行的任务
 */
const getTask = function () {}

/**
 * 移除指定房间的指定任务
 */
const removeTask = function () {}

/**
 * 将任务保存到内存中
 */
const saveTask = function () {}