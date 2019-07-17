const { creepDefaultMemory, creepsConfig } = require('config')

/** 
 * 能量锁 Memory.engryLock
 * 存于内存中 启动后将不允许获取基地的能量
 * 
 * 在基地需要新建蠕虫时打开
 * 在基地正在生成时关闭
*/

// 如果蠕虫死亡，则清除其记忆
const clearDiedCreep = () => {
    for(var name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('清除死去蠕虫记忆', name);
        }
    }
}

// 新数量控制
const creepNumberController = () => {
    const Home = Game.spawns['Spawn1']
    for (const creepConfig of creepsConfig) {
        // 通过返回值判断是否生成了蠕虫，生成了的话就不继续循环了
        let needSpawn = creepConfig.custom ? 
            customCreepController(creepConfig) :
            normalCreepController(creepConfig)
        
        if (needSpawn) break
    }

    // console.log(Memory.engryLock)
    if (Home.spawning) Memory.engryLock = false
}

// 启用自定义的蠕虫控制器
const customCreepController = (creepConfig) => {
    // 获取符合条件的蠕虫
    const creeps = getCreepByRole(creepConfig.role)
    const Home = Game.spawns['Spawn1']
    // 查看数量是否符合

    if (creeps.length < Object.keys(creepConfig.units).length && !Home.spawning) {
        Memory.engryLock = true
        console.log(`蠕虫类型: ${creepConfig.role} 存活数量低于要求 (${creeps.length}/${Object.keys(creepConfig.units).length}) 正在生成...`)
        
        // 查找是那个蠕虫死掉了
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

// 不启用自定义的蠕虫控制器
const normalCreepController = (creepConfig) => {
    const Home = Game.spawns['Spawn1']
    const creeps = getCreepByRole(creepConfig.role)
    if (creeps.length < creepConfig.number && !Home.spawning) {
        Memory.engryLock = true
        console.log(`蠕虫类型: ${creepConfig.role} 存活数量低于要求 (${creeps.length}/${creepConfig.number}) 正在生成...`)
        
        createNewCreep(Home, creepConfig.role, creepConfig.bodys)
        return true
    }
    return false
}

// 生成蠕虫
const createNewCreep = (Spawn, creepType, creepBodys) => {
    const creepName = creepType + Game.time
    let creepMemory = _.cloneDeep(creepDefaultMemory)
    creepMemory.memory.role = creepType

    Spawn.spawnCreep(creepBodys, creepName, creepMemory)
}

// 获取指定类型的蠕虫的数量
const getCreepByRole = (role) => {
    return _.filter(Game.creeps, (creep) => creep.memory.role == role)
}

module.exports = {
    creepNumberController,
    clearDiedCreep
}