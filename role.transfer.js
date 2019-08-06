const { getEngry, updateState } = require('utils')

/**
 * 运输者入口
 * @todo 搬运地上的垃圾
 * 
 * @param {object} creep 
 */
const run = (creep) => {
    const working = updateState(creep, '🚚 转移')
    
    if (working) {
        if (workTowerTransfer(creep)) { }
        else workExtensionTransfer(creep)
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
 * 目标是最近的 tower
 * 
 * @param {object} creep
 * @returns {boolean} 执行任务返回true，不执行任务返回false
 */
function workTowerTransfer(creep) {
    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: structure => structure.structureType == STRUCTURE_TOWER && 
                             structure.energy < structure.energyCapacity
    })

    transformTo(creep, target)
    return target ? true : false
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