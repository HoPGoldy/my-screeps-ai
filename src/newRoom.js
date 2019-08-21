/**
 * 新房间的支持任务
 * 从“支持房间”向“目标房间”提供“指定数量”的建筑者
 * 
 * @param {boolean} switch 是否启用任务
 * @param {string} targetRoom 目标房间的名称
 * @param {string} supportRoom 支持房间的名称
 * @param {number} builderNumber 要提供的支持者数量
 * @param {array} bodys 支援的建筑者身体部件
 */
const mission = {
    switch: true,
    targetRoom: 'W5N8',
    supportRoom: 'W6N8',
    builderNumber: 3,
    bodys: [WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE]
}

const { creepDefaultMemory } = require('config')

function supportBuilder() {
    // 如果任务没有打开则直接退出
    if (!mission.switch) return false
    // 检查支援数量是否已经足够
    const inplaces = _.filter(Game.creeps, creep => creep.name.includes(`${mission.targetRoom} builder`))
    if (inplaces.length >= mission.builderNumber) return true

    // 生成支援 creep
    const spawns = getRoomSpawn(mission.supportRoom)
    for (const spawnKey in spawns) {
        const spawn = spawns[spawnKey]
        if (!spawn.spawning) {
            spawnBuilder(spawn)
        }
    }
}

function getRoomSpawn(roomName) {
    return Game.rooms[roomName].find(FIND_MY_SPAWNS)
}

function spawnBuilder(spawn) {
    let creepMemory = _.cloneDeep(creepDefaultMemory)
    creepMemory.role = 'builder'
    creepMemory.room = mission.targetRoom

    const spawnResult = spawn.spawnCreep(mission.bodys, `${mission.targetRoom} builder${Game.time}`, {
        memory: creepMemory
    })
    // console.log("TCL: spawnBuilder -> spawnResult", spawnResult)
    
}

module.exports = {
    supportBuilder
}