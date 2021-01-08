import mountWork from './mount'
import { doing, generatePixel } from './utils'
import { stateScanner } from './modules/stateCollector'
import creepNumberListener from './modules/creepController'
import { execShard, saveShardData } from './modules/crossShard'
import { ErrorMapper } from './modules/errorMapper'
import { manageDelayTask } from 'modules/delayQueue'

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

    // 搓 pixel
    generatePixel()

    // 保存自己的跨 shard 消息
    saveShardData()

    // 统计全局资源使用
    stateScanner()
})

interface Class1 {
    func(arg: number): string
}

class A implements Class1 {
    func(arg: number) {
        return arg.toString()
    }
}

interface Class2 extends Class1 {
    func2(arg: string): number
}

class B extends A implements Class2 {
    func2(arg: string) {
        return Number(arg)
    }
}