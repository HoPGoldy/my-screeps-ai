import creepWork from './globel.creep'
import spawnWork from './globel.spawn'
import roomWork from './globel.room'
import mountWork from './mount'
import { clearDiedCreep } from './utils'

module.exports.loop = function (): void {
    // 挂载所有拓展
    mountWork()
    // 出生点工作
    spawnWork()
    // creep 工作
    creepWork()
    // 房间工作
    roomWork()
    // 清除死亡 creep 记忆
    clearDiedCreep()
}