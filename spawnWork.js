const { creepDefaultMemory, creepsConfig } = require('config')

/**
 * 如果蠕虫死亡，则清除其记忆
 */
const clearDiedCreep = () => {
    for(var name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('清除死去蠕虫记忆', name);
        }
    }
}

/**
 * creep 的数量控制
 */
const creepNumberController = () => {
    // 遍历所有蠕虫配置
    for (const creepConfig of creepsConfig) {
        // 根据是否启用自定义配置进行区别对待
        let needSpawn = creepConfig.custom ? 
            customCreepController(creepConfig) :
            normalCreepController(creepConfig)
        
        // 通过返回值判断是否生成了蠕虫，生成了的话就不再继续检查
        if (needSpawn) break
    }
}


/**
 * 启用了自定义配置的蠕虫数量检查，会检查 units 列表
 * 
 * @param {object} creepConfig 单个的蠕虫数量配置, 位于 config 的 creepsConfig 中
 */
const customCreepController = (creepConfig) => {
    // 获取符合条件的蠕虫
    const creeps = getCreepByRole(creepConfig.role)
    const Home = Game.spawns['Spawn1']

    // 查看数量是否符合
    if (creeps.length < Object.keys(creepConfig.units).length && !Home.spawning) {
        console.log(`蠕虫类型: ${creepConfig.role} 存活数量低于要求 (${creeps.length}/${Object.keys(creepConfig.units).length}) 正在生成...`)
        
        // 查找是哪个蠕虫死掉了
        for (const unitName in creepConfig.units) {
            
            if (!Game.creeps[unitName]) {
                const creepMemory = { memory: creepConfig.units[unitName] }
                // 生成蠕虫
                Home.spawnCreep(creepConfig.bodys, unitName, creepMemory)
                return true
            }
        }
    }
    return false
}

/**
 * 不启用自定义的蠕虫控制器，直接按照配置中的 number 字段进行生成
 * 
 * @param {object} creepConfig 单个的蠕虫数量配置, 位于 config 的 creepsConfig 中
 */
const normalCreepController = (creepConfig) => {
    const Home = Game.spawns['Spawn1']
    const creeps = getCreepByRole(creepConfig.role)
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

    Spawn.spawnCreep(creepBodys, creepName, creepMemory)
}

/**
 * 获取指定类型的蠕虫的数量
 * 
 * @param {string} role 蠕虫的角色
 */
const getCreepByRole = (role) => {
    return _.filter(Game.creeps, (creep) => creep.memory.role == role)
}

module.exports = {
    creepNumberController,
    clearDiedCreep
}