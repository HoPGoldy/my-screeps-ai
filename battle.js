const { creepDefaultMemory } = require('config')
const { claimerConfig } = require('config.battle')

function mount() {
    global.battle = {
        assemble, 
        shout,
        spawnClaimer
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
   
module.exports = mount