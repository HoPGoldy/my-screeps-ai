import mountWork from './mount'
import { doing, stateScanner, generatePixel } from './utils'
import creepNumberListener, { creepApi } from './creepController'

module.exports.loop = function (): void {
    // console.log(`-------------------------- [${Game.time}] -------------------------- `)
    
    // 挂载拓展
    mountWork()

    // creep 数量控制
    creepNumberListener()

    // 所有建筑工作
    doing(Game.structures)

    // 所有 creep 工作
    doing(Game.creeps)

    // 所有 powerCreep 工作
    doing(Game.powerCreeps)

    // 搓 pixel
    generatePixel()

    // 统计全局资源使用
    stateScanner()
}
