const attackPath = require('moveSetting').getPath('attack')

const run = (creep) => {
    // creep.moveTo(new RoomPosition(27, 42, 'W49S4'))
    
    // attack(creep, Game.getObjectById('5c9bbede5206340d397bb8e0'))
    creep.say('🎖⚔ NICE!')
}

const attack = (creep, target) => {
    if (creep.attack(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target.pos, attackPath)
    }
}

const destroyEverything = (creep) => {
    const target = creep.pos.findClosestByPath
}

module.exports = {
    run
}