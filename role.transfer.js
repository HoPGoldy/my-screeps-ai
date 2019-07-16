const { harvestEngry } = require('utils')

const run = (creep) => {
    const working = updateState(creep)

    if (working) {
        const targets = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                // 结构为塔
                return structure.structureType == STRUCTURE_TOWER
            }
        })

        if(targets.length > 0) {
            transformTo(creep, targets[0])
        }
    }
    else {
        harvestEngry(creep)
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
        creep.memory.working = false
        creep.say('⚡ 挖矿')
    }
    if(creep.carry.energy >= creep.carryCapacity) {
        creep.memory.working = true
        creep.say('🚚 转移')
    }

    return creep.memory.working
}

module.exports = {
    run
}