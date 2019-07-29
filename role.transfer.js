const { getEngry, updateState } = require('utils')

const run = (creep) => {
    const working = updateState(creep, '🚚 转移')
    
    if (working) {
        if (workExtensionTransfer(creep)) { }
        else workTowerTransfer(creep)
    }
    else {
        getEngry(creep)
    }
}

/**
 * 向 extension 转移能量
 * 目标是最近的 extension
 * 
 * @param {object} creep 
 */
function workExtensionTransfer(creep) {
    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: s => s.energy < s.energyCapacity && (
            s.structureType == STRUCTURE_EXTENSION ||
            s.structureType == STRUCTURE_SPAWN)
    })

    if (!target) return false

    transformTo(creep, target)
    return true
}

/**
 * 向 tower 转移能量
 * 目标是能量最低的 tower
 * @param {object} creep 
 */
function workTowerTransfer(creep) {
    const targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            // 结构为塔
            return structure.structureType == STRUCTURE_TOWER
        }
    })

    if(targets.length > 0) {
        // 找到能量最少的那个 tower
        const target = targets.reduce((smallTarget, target) => {
            // console.log(smallTarget.enrgy, target.enrgy)
            return smallTarget.enrgy < target.enrgy ? smallTarget : target
        })
        
        transformTo(creep, target)
    }
}

/**
 * 向指定结构转移能量
 * 
 * @param {object} creep 
 * @param {object} target 要传递能量的结构
 */
const transformTo = (creep, target) => {
    if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}})
    }
}

module.exports = {
    run
}