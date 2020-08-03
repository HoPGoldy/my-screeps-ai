import mountWork from './mount'
import { doing, stateScanner, generatePixel } from './utils'
import creepNumberListener from './modules/creepController'
import { checkShardMessage } from './modules/crossShard'
import { ErrorMapper } from './modules/errorMapper'

export const loop = ErrorMapper.wrapLoop(() => {
    if (Memory.showCost) console.log(`-------------------------- [${Game.time}] -------------------------- `)

    // 挂载拓展
    mountWork()

    // 检查跨 shard 请求
    checkShardMessage()

    // creep 数量控制
    creepNumberListener()

    // 所有建筑、creep、powerCreep 执行工作
    doing(Game.structures, Game.creeps, Game.powerCreeps)

    // 搓 pixel
    generatePixel()

    // 统计全局资源使用
    stateScanner()
})
