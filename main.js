const distributeWork = require('role')
const spawnWork = require('spawnWork')
const structureWork = require('structureWork')

module.exports.loop = function() {
    spawnWork.clearDiedCreep()
    spawnWork.creepNumberController()
    structureWork.towerWork()
    // structureWork.repair()

    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName]

        distributeWork(creep, creep.memory.role)
    }
}