const { harvestEngry, updateState } = require('utils')

const run = (creep) => {
    const working = updateState(creep, '🚚 转移')

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

module.exports = {
    run
}