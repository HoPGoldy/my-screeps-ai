import mountWork from './mount'
import { doing, stateScanner, globalSay } from './utils'
import creepNumberListener from './creepController'

module.exports.loop = function (): void {
    // console.log(`-------------------------- [${Game.time}] ----`)
    
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

    // 所有建筑工地工作
    if (!(Game.time % 100)) doing(Game.constructionSites)

    // 统计全局资源使用
    stateScanner()

    globalSay([
        '深切哀悼',
        '在抗击新冠疫情中',
        '牺牲的烈士',
        '与逝世的同胞',
        '愿逝者安息',
        '愿生者奋发',
        '愿祖国昌盛'
    ])
}

