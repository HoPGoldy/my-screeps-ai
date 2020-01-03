import mountWork from './mount'
import { doing } from './utils'

module.exports.loop = function (): void {
    // console.log(`-------------------------- [${Game.time}] ----`)
    
    // 挂载拓展
    mountWork()

    // 所有建筑工作
    doing(Game.structures)

    // 所有 creep 工作
    doing(Game.creeps)
}