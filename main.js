const distributeWork = require('role')
const spawnWork = require('spawnWork')
const structureWork = require('structureWork')

/**
 * 获取房间名
 * 使用 uniq 方法去重
 * 
 * @returns {list} 自己占领的房间名列表
 */
const getRoomList = () => {
    let rooms = []
    for (const spawnName in Game.spawns) {
        rooms.push(Game.spawns[spawnName].room.name)
    }
    return _.uniq(rooms)
}

/**
 * 房间控制
 * 执行每个房间的任务
 * 
 * @param {string} roomName 房间名称
 */
const roomWork = (roomName) => {
    if (!(roomName in Memory)) initRoom(roomName)
}

/**
 * 房间初始化
 * 初始化房间的 Memory ，包括矿注册表以及雷达扫描结果
 * 
 * @param {string} roomName 房间名称
 */
const initRoom = (roomName) => {
    console.log('房间初始化！')
}

module.exports.loop = function() {
    // for (const roomName in getRoomList()) {
    //     roomWork(roomName)
    // }


    spawnWork.clearDiedCreep()
    spawnWork.creepNumberController()
    structureWork.towerWork()

    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName]

        distributeWork(creep, creep.memory.role)
    }
}