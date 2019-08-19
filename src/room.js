// 引入雷达
const { scan } = require('room.radar')
// 引入 creep 数量控制汽车
const numberController = require('room.creepNumberController')
// 引入建筑作业控制器
const structureWorkController = require('room.structureWork')

/**
 * 房间控制
 * 执行每个房间的任务
 * 
 * @param {string} roomName 房间名称
 */
const roomWork = (roomName) => {
    const room = Game.rooms[roomName]
    // 兜底 如果内存中没有房间信息则初始化房间内容
    if (!(roomName in Memory)) initRoom(room)

    scan(room)
    numberController(room)
    structureWorkController(room)
}

/**
 * 房间初始化
 * 初始化房间的 Memory ，包括矿注册表以及雷达扫描结果
 * 
 * @param {object} room 房间名称
 */
const initRoom = (room) => {
    let roomMemory = {
        // 资源点注册表
        sourcesMap: {},
        // 雷达扫描结果
        radarResult: {}
    }

    // 建立资源点注册表
    room.find(FIND_SOURCES).map(source => roomMemory.sourcesMap[source.id] = null)
    // 将其存入内容
    Memory[room.name] = roomMemory
}

module.exports = roomWork