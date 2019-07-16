const defaultPath = require('moveSetting').defaultPath
const { harvestEngry } = require('utils')

const run = (creep) => {
    const working = updateState(creep)

    if (working) {
        upgradeController(creep)
    }
    else {
        harvestEngry(creep)
    }
}

// 更新并返回当前蠕虫状态
const updateState = (creep) => {
    if(creep.carry.energy <= 0) {
        creep.memory.working = false
        creep.say('⚡ 挖矿')
    }
    if(creep.carry.energy >= creep.carryCapacity) {
        creep.memory.working = true
        creep.say('🔧 升级')
    }

    return creep.memory.working
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