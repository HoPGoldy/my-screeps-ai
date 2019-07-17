const defaultPath = require('moveSetting').defaultPath

// 去资源点挖矿
const harvestEngry = (creep) => {
    let target = creep.memory.targetSourceId ? Game.getObjectById(creep.memory.targetSourceId) : creep.pos.findClosestByPath(FIND_SOURCES)
    // if (!target) target = creep.room.find(FIND_SOURCES)

    if (creep.harvest(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, defaultPath)
    }
}

// 状态更新
const updateState = (creep, workingMsg) => {
    if(creep.carry.energy <= 0  && creep.memory.working) {
        creep.memory.working = false
        creep.say('⚡ 挖矿')

        const targetSource = creep.pos.findClosestByPath(FIND_SOURCES)
        if (targetSource) creep.memory.targetSourceId = targetSource.id
    }
    if(creep.carry.energy >= creep.carryCapacity && !creep.memory.working) {
        creep.memory.working = true
        creep.say(workingMsg)
    }

    return creep.memory.working
}


module.exports = {
    harvestEngry,
    updateState
}