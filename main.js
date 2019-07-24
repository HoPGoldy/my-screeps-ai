// 引入工作分发器
const distributeWork = require('role')
// 引入房间工作
const roomWork = require('room')
// 引入出生点工作
const spawnWork = require('spawnWork')
// 引入结构工作
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

module.exports.loop = function() {
    for (const roomName of getRoomList()) {
        roomWork(roomName)
    }


    spawnWork.clearDiedCreep()
    spawnWork.creepNumberController()
    structureWork.towerWork()

    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName]

        distributeWork(creep, creep.memory.role)
    }
}