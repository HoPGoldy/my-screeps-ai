import mountWork from './mount'
import { creepNumberController, clearDiedCreep, syncCreepConfig, doing } from './utils'

module.exports.loop = function (): void {
    // 挂载所有拓展
    mountWork()

    // creep 数量检查
    creepNumberController()

    // 所有建筑干活
    doing(Game.structures)

    // 所有 creep 干活
    doing(Game.creeps)
}