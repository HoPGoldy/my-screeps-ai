const upgradePath = require('moveSetting').getPath('upgrade')
const { harvestEngry, updateState } = require('utils')

const run = (creep) => {
    const working = updateState(creep, '🔧 升级')
    
    if (working) {
        upgradeController(creep)
    }
    else {
        harvestEngry(creep)
    }
}

/**
 * 升级房间控制器
 * 
 * @param {object} creep 
 */
const upgradeController = (creep) => {
    const controller = creep.room.controller
    if(creep.upgradeController(controller) == ERR_NOT_IN_RANGE) {
        creep.moveTo(controller, upgradePath)
    }
}

module.exports = {
    run
}