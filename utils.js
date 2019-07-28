const havestPath = require('moveSetting').getPath('havest')

/**
 * 去资源点挖矿
 * 
 * @param {object} creep 
 */
const harvestEngry = (creep) => {
    const closestSource = creep.pos.findClosestByPath(FIND_SOURCES)

    // 挖掘实现
    if (creep.harvest(closestSource, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(closestSource, havestPath)
    }
}

/**
 * 获取能量
 * 优先从 container 中获取，没有的话再去挖矿
 * 
 * @param {object} creep 
 */
function getEngry(creep) {
    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: structure => structure.structureType == STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] > 0
    })
    if (target) {
        if(creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, havestPath)
        }
    }
    else {
        harvestEngry(creep)
    }
}

/**
 * 状态更新
 * 
 * @param {object} creep 
 * @param {object} workingMsg 切换为工作状态时的语音提示
 */
const updateState = (creep, workingMsg) => {
    // creep 身上没有能量 && creep 之前的状态为“工作”
    if(creep.carry.energy <= 0 && creep.memory.working) {
        // 切换状态
        creep.memory.working = false
        creep.say('⚡ 挖矿')
    }
    // creep 身上能量满了 && creep 之前的状态为“不工作”
    if(creep.carry.energy >= creep.carryCapacity && !creep.memory.working) {
        // 切换状态
        creep.memory.working = true
        creep.say(workingMsg)
    }

    return creep.memory.working
}

/**
 * 获取旗子周边最近的指定结构
 * 只能搜索自己的结构 FIND_MY_STRUCTURES
 * 
 * @param {object} flag 旗子对象
 * @param {string} STRUCTURE_NAME 结构名称，STRUCTURE_*
 * @returns {object|undefined} 指定的结构对象 没找到则返回undefined
 */
function getClosestStructureByFlag(flag, STRUCTURE_NAME) {
    return flag.pos.findClosestByRange(FIND_MY_STRUCTURES, {
        filter: structure => {
            return structure.structureType === STRUCTURE_NAME
        }
    })
}

module.exports = {
    harvestEngry,
    getEngry,
    updateState,
    getClosestStructureByFlag
}