const { getEngryFrom, findExtensionWithEngry } = require('utils')

const run = (creep) => {
    const state = updateState(creep)
    const targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            // 结构为塔
            return structure.structureType == STRUCTURE_TOWER
        }
    })

    switch (state) {
        case 'harvest':
            const engryExtension = findExtensionWithEngry(creep)
            const target = engryExtension ? engryExtension : Game.spawns['Spawn1']
            // console.log(target)
            getEngryFrom(creep, target)
        break
        case 'transfe':
            if(targets.length > 0) {
                transformTo(creep, targets[0])
            }
        break
    }    
}

const transformTo = (creep, target) => {
    if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
    }
}

// 更新并返回当前蠕虫状态
const updateState = (creep) => {
    if(creep.carry.energy <= 0) {
        creep.memory.state = 'harvest'
        // creep.say('🔄 harvest')
    }
    if(creep.carry.energy >= creep.carryCapacity) {
        creep.memory.state = 'transfe'
        // creep.say('🚧 upgrade')
    }

    return creep.memory.state
}

module.exports = {
    run
}