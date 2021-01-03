/**
 * 工作任务中相关的延迟任务
 */

import { addDelayCallback, addDelayTask } from 'modules/delayQueue'

/**
 * 注册 repairer 的延迟孵化任务
 */
addDelayCallback('spawnRepairer', room => {
    if (!room) return

    // cpu 还是不够的话就延迟发布
    if (Game.cpu.bucket < 700) return addSpawnRepairerTask(room.name)

    room.releaseCreep('repairer')
})

/**
 * 注册 miner 的延迟孵化任务
 */
addDelayCallback('spawnMiner', room => {
    if (!room) return

    // cpu 不够的话就延迟发布
    if (Game.cpu.bucket < 700) return addSpawnMinerTask(room.name, 1000)

    room.releaseCreep('miner')
})

/**
 * 给指定房间添加 repairer 的延迟孵化任务
 * 
 * @param roomName 添加到的房间名
 */
export const addSpawnRepairerTask = function (roomName) {
    addDelayTask('spawnRepairer', { roomName }, Game.time + 5000)
}

/**
 * 添加 miner 的延迟孵化任务
 * @param roomName 添加到的房间名
 * @param delayTime 要延迟的时间，一般都是 mineal 的重生时间
 */
export const addSpawnMinerTask = function (roomName, delayTime) {
    addDelayTask('spawnMiner', { roomName }, delayTime + 1)
}