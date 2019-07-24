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
    /**
     * 查找出生点
     * @todo 使用房间内其他出生点, 现在只用了第一个出生点
     */
    const Home = room.find(FIND_STRUCTURES, {
        filter: s => s.structureType == STRUCTURE_SPAWN
    })[0]

    const creeps = getCreepByRole(creepConfig.role, room.name)
    // 如果数量不够了 && 基地没在生成
    if (creeps.length < creepConfig.number && !Home.spawning) {
        console.log(`蠕虫类型: ${creepConfig.role} 存活数量低于要求 (${creeps.length}/${creepConfig.number}) 正在生成...`)
        
        // 生成新的 creep
        createNewCreep(Home, creepConfig.role, creepConfig.bodys)
        return true
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
    const creepName = creepType + Game.time
    let creepMemory = _.cloneDeep(creepDefaultMemory)
    creepMemory.memory.role = creepType

    let spawnResult = Spawn.spawnCreep(creepBodys, creepName, creepMemory)
    
    // 如果能量不足并且挖矿 creep 都死了，则构建简单 creep
    if (spawnResult == ERR_NOT_ENOUGH_ENERGY && getCreepByRole('worker', Spawn.room.name).length <= 0) {
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

module.exports = numberController