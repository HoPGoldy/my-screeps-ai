const defaultPath = require('moveSetting').defaultPath

/**
 * 去资源点挖矿
 * 
 * @param {object} creep 
 */
const harvestEngry = (creep) => {
    // 从 creep 内存中读取目标资源点
    let target = Game.getObjectById(creep.memory.targetSourceId)
    // 如果目标不存在就尝试重新获取资源点
    if (!target) {
        const closestSource = creep.pos.findClosestByPath(FIND_SOURCES)
        // 如果有可用资源点，就存进内存
        if (closestSource) {
            creep.memory.targetSourceId = closestSource.id
            target = closestSource
        }
    }
    // 挖掘实现
    if (creep.harvest(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, defaultPath)
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
        // 首次获取可用资源点
        const targetSource = creep.pos.findClosestByPath(FIND_SOURCES)
        // 如果获取到了就用，获取不到就置为空，交给 harvestEngry() 尝试获取
        creep.memory.targetSourceId = targetSource ? targetSource.id : undefined
    }
    // creep 身上能量满了 && creep 之前的状态为“不工作”
    if(creep.carry.energy >= creep.carryCapacity && !creep.memory.working) {
        // 切换状态
        creep.memory.working = true
        creep.say(workingMsg)
    }

    return creep.memory.working
}


module.exports = {
    harvestEngry,
    updateState
}