import creepWork from './globel.creep'
import spawnWork from './globel.spawn'
import { clearDiedCreep } from './utils'

module.exports.loop = function (): void {
    spawnWork()
    creepWork()
    clearDiedCreep()
}