import mountWork from './mount'
import spawnWork from './global.spawn'
import roomWork from './global.room'
import creepWork from './global.creep'

import { clearDiedCreep } from './utils'

module.exports.loop = function (): void {
    // 挂载所有拓展
    mountWork()
    // 出生点工作
    spawnWork()
    // 房间工作
    roomWork()
    // creep 工作
    creepWork()
    // 清除死亡 creep 记忆
    clearDiedCreep()
}