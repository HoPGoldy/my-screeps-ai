const { creepDefaultMemory } = require('config')
const { claimerConfig, soldierConfig } = require('config.battle')

function mount() {
    global.b = {
        assemble, 
        shout,
        sc: spawnClaimer,
        ss: spawnSoldier
    }
}

function assemble() {
    console.log('集结！')
}

function shout() {
    console.log('呼哈！')
}


function spawnClaimer(roomName, bodys=[]) {
    const room = Game.rooms[roomName]
    if (!room) {
        console.log(`${roomName} 并不是一个有效的房间名`)
        return false
    }
    const spawn = room.find(FIND_MY_SPAWNS)[0]

    // 定义名称、内存及身体部分
    const creepName = 'claimer' + Game.time
    let creepMemory = _.cloneDeep(creepDefaultMemory)
    creepMemory.role = 'claimer'
    let creepBodys = bodys.length > 0 ? bodys : claimerConfig.bodys
    // 生成 claimer
    const spawnResult = spawn.spawnCreep(creepBodys, creepName, {
        memory: creepMemory
    })
    if (spawnResult == OK) console.log(`${roomName} ${spawn.name} 正在生成 claimer`)
    else if (spawnResult == ERR_NOT_ENOUGH_ENERGY) console.log(`${roomName} 能量不足`)
}

function spawnSoldier(roomName, squad=1, bodys=[]) {
    const room = Game.rooms[roomName]
    if (!room) {
        console.log(`${roomName} 并不是一个有效的房间名`)
        return false
    }
    const spawn = room.find(FIND_MY_SPAWNS)[0]

    // 定义名称、内存及身体部分
    const creepName = 'soldier' + Game.time
    let creepMemory = _.cloneDeep(creepDefaultMemory)
    creepMemory.role = 'soldier'
    creepMemory.squad = squad
    let creepBodys = bodys.length > 0 ? bodys : soldierConfig.bodys
    // 生成 soldier
    const spawnResult = spawn.spawnCreep(creepBodys, creepName, {
        memory: creepMemory
    })
    if (spawnResult == OK) console.log(`${roomName} ${spawn.name} 正在生成 soldier`)
    else if (spawnResult == ERR_NOT_ENOUGH_ENERGY) console.log(`${roomName} 能量不足`)
    else console.log(spawnResult)
}

module.exports = mount