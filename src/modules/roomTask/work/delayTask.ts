/**
 * 工作任务中相关的延迟任务
 */

import { addDelayCallback, addDelayTask } from 'modules/delayQueue'
import { MINE_LIMIT } from 'setting'

/**
 * 注册刷墙工的延迟孵化任务
 */
addDelayCallback('spawnFiller', room => {
    if (!room) return

    // cpu 还是不够的话就延迟发布
    if (Game.cpu.bucket < 700) return addSpawnRepairerTask(room.name)

    room.work.updateTask({ type: 'fillWall' })
})

/**
 * 注册 miner 的延迟孵化任务
 */
addDelayCallback('spawnMiner', room => {
    // 房间或终端没了就不在孵化
    if (!room || !room.terminal) return

    // 满足以下条件时就延迟发布
    if (
        // cpu 不够
        Game.cpu.bucket < 700 ||
        // 矿采太多了
        room.terminal.store[room.mineral.mineralType] >= MINE_LIMIT
    ) return addSpawnMinerTask(room.name, 1000)

    room.work.updateTask({ type: 'mine', need: 1 })
})

/**
 * 给指定房间添加刷墙工的延迟孵化任务
 * 
 * @param roomName 添加到的房间名
 */
export const addSpawnRepairerTask = function (roomName) {
    addDelayTask('spawnFiller', { roomName }, Game.time + 5000)
}

/**
 * 添加 miner 的延迟孵化任务
 * @param roomName 添加到的房间名
 * @param delayTime 要延迟的时间，一般都是 mineal 的重生时间
 */
export const addSpawnMinerTask = function (roomName, delayTime) {
    addDelayTask('spawnMiner', { roomName }, delayTime + 1)
}