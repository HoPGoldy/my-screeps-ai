const defaultPath = require('moveSetting').defaultPath
const { getEngryFrom, findExtensionWithEngry } = require('utils')

const run = (creep) => {
    const state = updateState(creep)

    switch (state) {
        case 'harvest':
            const engryExtension = findExtensionWithEngry(creep)
            const target = engryExtension ? engryExtension : Game.spawns['Spawn1']
            // console.log(target)
            getEngryFrom(creep, target)
        break
        case 'build':
            build(creep)
        break
    }
}

// 更新并返回当前蠕虫状态
const updateState = (creep) => {
    if(creep.carry.energy == 0) {
        creep.memory.state = 'harvest'
        creep.say('🔄 harvest')
    }
    if(creep.carry.energy == creep.carryCapacity) {
        creep.memory.state = 'build'
        creep.say('🚧 build')
    }

    return creep.memory.state
}

// 寻找存在的工地并建造
const build = (creep) => {
    const targets = creep.room.find(FIND_CONSTRUCTION_SITES)
    if(targets.length) {
        if(creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
            creep.moveTo(targets[0], defaultPath)
        }
    }
}

module.exports = {
    run
}