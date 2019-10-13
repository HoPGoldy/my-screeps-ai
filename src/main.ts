import mountWork from './mount'
import { creepNumberController, doing } from './utils'

module.exports.loop = function (): void {
    // 挂载所有拓展
    mountWork()

    //数量控制
    creepNumberController()

    // 所有建筑工作
    doing(Game.structures)

    // 所有 creep 工作
    doing(Game.creeps)
}