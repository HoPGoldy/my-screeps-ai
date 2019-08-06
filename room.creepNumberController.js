const { creepDefaultMemory, creepsNumberConfig } = require('config')

/**
 * 房间控制器入口
 * 
 * @param {object} room 执行 creep 数量控制的房间
 */
const numberController = (room) => {
    let needSpawnCreeps = []
    const spawns = getActiveSpawn(room)
    if (_.isEmpty(spawns)) return true

    // 遍历本房间所有蠕虫数量配置
    for (const creepConfig of creepsNumberConfig[room.name]) {
        // 获取其数量
        const creeps = getCreepByRole(creepConfig.role, room.name)
        // 加入待生成队列并检查数量是否超过出生点的数量
        if (creeps.length < creepConfig.number) {
            needSpawnCreeps.push(creepConfig)
            if (needSpawnCreeps.length >= spawns.length) break
        }
    }
    // 遍历队列，生成 creep
    needSpawnCreeps.map((config, index) => {
        createNewCreep(spawns[index], config)
    })
}

/**
 * 生成蠕虫
 * 
 * @param {object} spawn 出生点
 * @param {string} creepConfig.role 蠕虫的角色
 * @param {array} creepConfig.bodys 蠕虫的身体组成
 */
const createNewCreep = (spawn, creepConfig) => {
    // 拼接名称
    const creepName = spawn.room.name + ' ' + creepConfig.role + Game.time
    //初始化 creep 内存
    let creepMemory = _.cloneDeep(creepDefaultMemory)
    creepMemory.role = creepConfig.role
    creepMemory.room = spawn.room.name

    let spawnResult = spawn.spawnCreep(creepConfig.bodys, creepName, {
        memory: creepMemory
    })
    if (spawnResult == OK) {
        console.log(`${spawn.room.name} 正在生成 ${creepConfig.role}`)
    }
    else if (spawnResult == ERR_NOT_ENOUGH_ENERGY) {
        console.log(`${spawn.room.name} 能量[${spawn.room.energyAvailable}]不足以生成 ${creepConfig.role} `)
        // 如果能量不足并且挖矿 creep 都死了，则构建简单 creep
        if (getCreepByRole('harvester', spawn.room.name).length <= 0) {
            spawn.spawnCreep([WORK, CARRY, MOVE], creepName, {
                memory: creepMemory
            })
        }
    }
}

/**
 * 获取指定类型的 creep 数量
 * @todo 更好的查询
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