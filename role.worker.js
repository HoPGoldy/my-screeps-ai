const defaultPath = require('moveSetting').defaultPath
const { harvestEngry } = require('utils')

const run = (creep) => {
    const working = updateState(creep)

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

// 更新并返回当前蠕虫状态
const updateState = (creep) => {
    if(creep.carry.energy <= 0) {
        creep.memory.working = false
        creep.say('⚡ 挖矿')
    }
    if(creep.carry.energy >= creep.carryCapacity) {
        creep.memory.working = true
        creep.say('🚛 带回')
    }

    return creep.memory.working
}

module.exports = {
    run
}