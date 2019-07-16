const defaultPath = require('moveSetting').defaultPath
const upgrader = require('role.upgrader')
const { harvestEngry } = require('utils')

const run = (creep) => {
    const working = updateState(creep)

    if (working) {
        const targets = creep.room.find(FIND_CONSTRUCTION_SITES)
        if (targets.length > 0) {
            build(creep, targets[0])
        }
        else {
            upgrader.run(creep)
        }
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
        creep.say('🚧 建造')
    }

    return creep.memory.working
}

// 寻找存在的工地并建造
const build = (creep, target) => {
    if(creep.build(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, defaultPath)
    }
}

module.exports = {
    run
}