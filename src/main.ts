import creepWork from './globel.creep'
import spawnWork from './globel.spawn'
import roomWork from './globel.room'
import { clearDiedCreep } from './utils'

module.exports.loop = function (): void {
    spawnWork()
    creepWork()
    roomWork()
    clearDiedCreep()
}