const defaultPath = require('moveSetting').defaultPath
const { getEngryFrom, findExtensionWithEngry } = require('utils')

const run = (creep) => {
    // upgrade / harvest
    const state = updateState(creep)

    switch (state) {
        case 'harvest':
            const engryExtension = findExtensionWithEngry(creep)
            const target = engryExtension ? engryExtension : Game.spawns['Spawn1']
            // console.log(target)
            getEngryFrom(creep, target)
        break
        case 'upgrade':
            upgradeController(creep)
        break
    }
}

// 更新并返回当前蠕虫状态
const updateState = (creep) => {
    if(creep.carry.energy <= 0) {
        creep.memory.state = 'harvest'
        creep.say('🔄 harvest')
    }
    if(creep.carry.energy >= creep.carryCapacity) {
        creep.memory.state = 'upgrade'
        creep.say('🚧 upgrade')
    }

    return creep.memory.state
}

// 升级房间控制器
const upgradeController = (creep) => {
    const controller = creep.room.controller
    if(creep.upgradeController(controller) == ERR_NOT_IN_RANGE) {
        creep.moveTo(controller, defaultPath)
    }
}

module.exports = {
    run
}