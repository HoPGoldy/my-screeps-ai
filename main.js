// 引入工作分发器
const distributeWork = require('role')
// 引入房间工作
const roomWork = require('room')
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

/**
 * 如果蠕虫死亡，则清除其记忆
 */
const clearDiedCreep = () => {
    // 每 1000 tick 执行一次
    if (Game.time % 1000) return false

    for(var name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('清除死去蠕虫记忆', name);
        }
    }
}

module.exports.loop = function() {
    // 遍历每一个房间
    for (const roomName of getRoomList()) {
        // 执行房间内的工作
        roomWork(roomName)
    }

    structureWork.towerWork()

    // 遍历每一个蠕虫
    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName]
        // 通过其内存中的 role 来分配工作
        distributeWork(creep, creep.memory.role)
    }

    // 清理死去的蠕虫记忆
    clearDiedCreep()
}