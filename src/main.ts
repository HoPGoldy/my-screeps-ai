import mountWork from './mount'
import { doing, generatePixel } from './utils'
import { stateScanner } from './modules/stats'
import creepNumberListener from './modules/creepController'
import { execShard, saveShardData } from './modules/crossShard'
import { ErrorMapper } from './modules/errorMapper'
import { manageDelayTask } from 'modules/delayQueue'
import { manageConstruction } from 'modules/constructionController'

// 挂载拓展
mountWork()

export const loop = ErrorMapper.wrapLoop(() => {
    if (Memory.showCost) console.log(`-------------------------- [${Game.time}] -------------------------- `)

    // 检查跨 shard 请求
    execShard()

    // creep 数量控制
    creepNumberListener()

    // 所有建筑、creep、powerCreep 执行工作
    doing(Game.structures, Game.creeps, Game.powerCreeps)

    // 处理延迟任务
    manageDelayTask()

    // 处理待建造工地
    manageConstruction()

    // 搓 pixel
    generatePixel()

    // 保存自己的跨 shard 消息
    saveShardData()

    // 统计全局资源使用
    stateScanner()
})
