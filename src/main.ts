import mountWork from './mount'
import { doing, stateScanner } from './utils'

module.exports.loop = function (): void {
    // console.log(`-------------------------- [${Game.time}] ----`)
    
    // 挂载拓展
    mountWork()

    // 所有建筑工作
    doing(Game.structures)

    // 所有 creep 工作
    doing(Game.creeps)

    // 统计全局资源使用
    stateScanner()
}