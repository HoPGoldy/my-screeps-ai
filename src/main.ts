import mountWork from './mount'
import { doing, stateScanner } from './utils'
import creepNumberListener from './creepController'

module.exports.loop = function (): void {
    // console.log(`-------------------------- [${Game.time}] ----`)
    
    // 挂载拓展
    mountWork()

    // 所有建筑工作
    doing(Game.structures)

    creepNumberListener()

    // 所有 creep 工作
    doing(Game.creeps)

    // 所有 powerCreep 工作
    doing(Game.powerCreeps)

    // 所有建筑工地工作
    const cost = Game.cpu.getUsed()
    doing(Game.constructionSites)
    console.log('工地消耗', Game.cpu.getUsed() - cost)

    // 统计全局资源使用
    stateScanner()
}