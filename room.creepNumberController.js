const { creepDefaultMemory, creepsNumberConfig } = require('config')

/**
 * 房间控制器入口
 * 
 * @param {object} room 执行 creep 数量控制的房间
 */
const numberController = (room) => {
    // 遍历本房间所有蠕虫数量配置
    for (const creepConfig of creepsNumberConfig[room.name]) {
        let needSpawn = creepController(creepConfig, room)
        
        // 通过返回值判断是否生成了蠕虫，生成了的话就不再继续检查
        if (needSpawn) break
    }
}

/**
 * 蠕虫数量控制器
 * 按照配置中的 number 字段进行生成
 * 
 * @param {object} creepConfig 单个的蠕虫数量配置, 位于 config 的 creepsConfig 中
 * @param {object} room 房间，用于获取出生点
 * @returns {boolean} 是否需要/正在生成蠕虫
 */
const creepController = (creepConfig, room) => {
    const creeps = getCreepByRole(creepConfig.role, room.name)
    // 如果数量不够了 && 基地没在生成
    if (creeps.length < creepConfig.number && !Home.spawning) {
        console.log(`蠕虫类型: ${creepConfig.role} 存活数量低于要求 (${creeps.length}/${creepConfig.number}) 正在生成...`)
        // 获取可用的出生点
        const spawns = getActiveSpawn(room)

        if (spawns.length > 0) {
            // 生成新的 creep
            createNewCreep(spawns[0], creepConfig.role, creepConfig.bodys)
            return spawns.length > 1 ? true : false
        }
    }
    return false
}

/**
 * 生成蠕虫
 * 
 * @param {object} Spawn 出生点
 * @param {string} creepType 蠕虫的角色
 * @param {array} creepBodys 蠕虫的身体组成
 */
const createNewCreep = (Spawn, creepType, creepBodys) => {
    const creepName = Spawn.roome.name + '' + creepType + Game.time
    let creepMemory = _.cloneDeep(creepDefaultMemory)
    creepMemory.memory.role = creepType
    creepMemory.memory.roome = Spawn.roome.name

    let spawnResult = Spawn.spawnCreep(creepBodys, creepName, creepMemory)
    
    // 如果能量不足并且挖矿 creep 都死了，则构建简单 creep
    if (spawnResult == ERR_NOT_ENOUGH_ENERGY && getCreepByRole('harvester', Spawn.room.name).length <= 0) {
        Spawn.spawnCreep([WORK, CARRY, MOVE], creepName, creepMemory)
    }
}

/**
 * 获取指定类型的 creep 数量
 * 
 * @param {string} role creep 的角色
 * @param {string} roomName creep 所在的房间名
 * @returns {array} 满足条件的 creep 数组
 */
const getCreepByRole = (role, roomName) => {
    return _.filter(Game.creeps, creep => (creep.memory.role == role) && (creep.room.name == roomName))
}

/**
 * 获取房间内可用的 spawn
 * 可用：当前没有生成 creep
 * 
 * @param {object} room 进行查找的房间对象
 * @returns {array|undefined} 满足条件的 spawn，没找到则返回 undefined
 */
function getActiveSpawn(room) {
    return room.find(FIND_MY_SPAWNS, {
        filter: spawn => spawn.spawning == null
    })
}

module.exports = numberController