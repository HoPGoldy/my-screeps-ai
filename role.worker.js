const defaultPath = require('moveSetting').defaultPath
const { harvestEngry, updateState } = require('utils')

const run = (creep) => {
    const working = updateState(creep, '🚛 带回')

    if (working) {
        carryBack(creep)
    }
    else {
        // 优先捡垃圾
        const dropEngry = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES)
        if (dropEngry) {
            pickDropEngry(creep, dropEngry)
        }
        else {
            harvestEngry(creep)
        }
    }
}

// 捡垃圾
const pickDropEngry = (creep, dropEngry) => {
    if(creep.pickup(dropEngry) == ERR_NOT_IN_RANGE) {
        creep.moveTo(dropEngry, defaultPath)
    }
}

// 将矿带回存储点
const carryBack = (creep) => {
    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
            return structure.energy < structure.energyCapacity && 
                   (structure.structureType == STRUCTURE_EXTENSION || 
                    structure.structureType == STRUCTURE_SPAWN)
        }
    })
    if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, defaultPath)
    }
}

module.exports = {
    run
}