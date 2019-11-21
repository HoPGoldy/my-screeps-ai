import mountWork from './mount'
import { creepNumberController, shareController, doing } from './utils'

/**
 * @todo 外矿和 core 的对决
 */
module.exports.loop = function (): void {
    // console.log(`-------------------------- [${Game.time}] ----`)
    
    // 挂载所有拓展
    mountWork()

    // 数量控制
    creepNumberController()

    // 资源共享控制
    shareController()

    // let cost1 = Game.cpu.getUsed()
    // 所有建筑工作
    doing(Game.structures)
    // let cost2 = Game.cpu.getUsed()
    // console.log(`[建筑消耗] ${cost2 - cost1}`)

    // 所有 creep 工作
    doing(Game.creeps)
    // cost1 = Game.cpu.getUsed()
    // console.log(`[creep消耗] ${cost1 - cost2}`)
}