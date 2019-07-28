const attackPath = require('moveSetting').getPath('attack')

const run = (creep) => {
    // creep.moveTo(new RoomPosition(24, 21, 'W48S6'))
    claim(creep, Game.getObjectById('5bbcaa719099fc012e6315f2'))
}

const claim = (creep, target) => {
    if (creep.claimController(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target.pos, attackPath)
    }
}

module.exports = {
    run
}