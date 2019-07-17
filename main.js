const distributeWork = require('role.index')
const spawnWork = require('spawnWork')
const structureWork = require('structureWork')

module.exports.loop = function() {
    spawnWork.clearDiedCreep()
    spawnWork.creepNumberController()
    structureWork.repair()

    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName]

        distributeWork(creep, creep.memory.role)
    }
}