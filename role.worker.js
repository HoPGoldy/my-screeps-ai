const defaultPath = require('moveSetting').defaultPath

const run = (creep) => {
    // 优先捡垃圾
    if (creep.carry.energy < creep.carryCapacity) {
        const dropEngry = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES)
        if (dropEngry) {
            pickDropEngry(creep, dropEngry)
        }
        else {
            harvest(creep)
        }
    }
    else {
        carryBack(creep)
    }
}

// 采矿
const harvest = (creep) => {
    const sources = creep.room.find(FIND_SOURCES)
    if (creep.harvest(sources[creep.memory.sourceIndex]) == ERR_NOT_IN_RANGE) {
        creep.moveTo(sources[creep.memory.sourceIndex], defaultPath)
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
    const Home = Game.spawns['Spawn1']
    if (Home.energy < Home.energyCapacity) {
        carryBackTo(creep, Home)
    }
    else {
        const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (structure) => {
                return structure.structureType == STRUCTURE_EXTENSION && structure.energy < structure.energyCapacity
            }
        })
        carryBackTo(creep, target)
    }
}

// 把矿带回 target 建筑
const carryBackTo = (creep, target) => {
    if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, defaultPath)
    }
}

module.exports = {
    run
}