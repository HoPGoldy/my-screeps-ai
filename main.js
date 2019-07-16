const worker = require('role.worker')
const upgrader = require('role.upgrader')
const builder = require('role.builder')
const transfer = require('role.transfer')
const spawnWork = require('spawnWork')
const structureWork = require('structureWork')

module.exports.loop = function() {
    spawnWork.clearDiedCreep()
    spawnWork.creepNumberController()
    structureWork.repair()
    // console.log('hello world')
    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName]

        switch (creep.memory.role) {
            case 'worker': worker.run(creep)
            break
            case 'upgrader': upgrader.run(creep)
            break
            case 'builder': builder.run(creep)
            break
            case 'transfer': transfer.run(creep)
            break
        }
    }
}