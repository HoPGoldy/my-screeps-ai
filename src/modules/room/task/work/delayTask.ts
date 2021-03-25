/**
 * 工作任务中相关的延迟任务
 */

import { delayQueue } from '@/modules/delayQueue'
import { MINE_LIMIT } from '@/setting'

/**
 * 注册刷墙工的延迟孵化任务
 */
delayQueue.addDelayCallback('spawnFiller', room => {
    if (!room) return

    // cpu 还是不够的话就延迟发布
    if (Game.cpu.bucket < 700) return addSpawnRepairerTask(room.name)

    room.work.updateTask({ type: 'fillWall' })
})

/**
 * 注册 miner 的延迟孵化任务
 */
delayQueue.addDelayCallback('spawnMiner', room => {
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
 * 注册建筑任务发布
 */
delayQueue.addDelayCallback('addBuildTask', (room, task) => {
    // 如果没有工地的话就创建并再次发布建造任务
    if (!room) {
        addBuildTask(task.roomName)
        return
    }

    // 以指定工地为目标发布建筑
    room.work.updateTask({ type: 'build', priority: 9 }, { dispath: true })
})

/**
 * 给指定房间添加刷墙工的延迟孵化任务
 * 
 * @param roomName 添加到的房间名
 */
export const addSpawnRepairerTask = function (roomName: string) {
    delayQueue.addDelayTask('spawnFiller', { roomName }, Game.time + 5000)
}

/**
 * 添加 miner 的延迟孵化任务
 * @param roomName 添加到的房间名
 * @param delayTime 要延迟的时间，一般都是 mineal 的重生时间
 */
export const addSpawnMinerTask = function (roomName: string, delayTime: number) {
    delayQueue.addDelayTask('spawnMiner', { roomName }, delayTime + 1)
}

/**
 * 添加工地建造任务
 * 因为工地在下个 tick 才能被发现，所以需要延迟任务
 * 如果下个 tick 没有发现的话就会重新放置并再次发布任务尝试添加
 * 
 * @param handleRoomName 建筑任务要发布到那个房间，默认为 pos 所在房间
 */
export const addBuildTask = function (handleRoomName: string) {
    delayQueue.addDelayTask('addBuildTask', {
        roomName: handleRoomName
    }, Game.time + 1)
}