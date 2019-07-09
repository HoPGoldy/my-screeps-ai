const defaultPath = require('moveSetting').defaultPath

// 去 target 建筑获取能量
const getEngryFrom = (creep, target) => {
    // 能量锁启用时不可获取能量
    if (!Memory.engryLock) {
        if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, defaultPath)
        }
    }
    else {
        creep.moveTo(target, defaultPath)
    }
}

// 查找最近的有能量的 extension
const findExtensionWithEngry = (creep) => {
    return creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) => {
            return structure.structureType == STRUCTURE_EXTENSION && structure.energy != 0
        }
    })
}

module.exports = {
    getEngryFrom,
    findExtensionWithEngry
}