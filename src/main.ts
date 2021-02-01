import { generatePixel } from './utils'
import { stateScanner } from './modules/stats'
import creepNumberListener from './modules/creepController'
import { execShard, saveShardData } from './modules/crossShard'
import { manageDelayTask } from 'modules/delayQueue'
import { manageConstruction } from 'modules/constructionController'
import app from 'mount'

// 注册跨 shard 模块
app.on({
    tickStart: execShard,
    tickEnd: saveShardData
})

// 注册 creep 数量控制
app.on({
    tickStart: creepNumberListener
})

app.on({
    afterWork: () => {
        // 处理延迟任务
        manageDelayTask()
        // 处理待建造工地
        manageConstruction()
    }
})

app.on({
    tickEnd: () => {
        // 搓 pixel
        generatePixel()
        // 统计全局资源使用
        stateScanner()
    }
})

export const loop = () => app.run()
