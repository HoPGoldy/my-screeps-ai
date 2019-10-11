import mountWork from './mount'
import { clearDiedCreep, syncCreepConfig, doing } from './utils'

module.exports.loop = function (): void {
    // 挂载所有拓展
    mountWork()

    // 清除死亡 creep 记忆
    clearDiedCreep()
    
    // 定期同步 creep 配置
    syncCreepConfig()

    // 所有建筑干活
    doing(Game.structures)

    // 所有 creep 干活
    doing(Game.creeps)
}