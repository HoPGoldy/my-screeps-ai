/**
 * creep 控制模块
 * 
 * 负责 creep 的新增、删除及修改，creep 死后也会由该模块负责回收或再孵化
 * 更多细节 @see creep控制协议设计案.md
 */

import { addCrossShardRequest } from '@/modules/crossShard'
import { handleNotExistCreep } from './creepHandle'
export { default as creepApi }  from './creepApi'

/**
 * 上个 tick 的 Game.creeps
 * 用于和本 tick 进行比对，初步确定是否有 creep 死亡
 */
let lastGameCreepNumber: number = 0

/**
 * creep 的数量控制器
 * 负责发现死去的 creep 并检查其是否需要再次孵化
 * 
 * @param intrval 搜索间隔
 */
export default function creepNumberListener(): void {
    const nowGameCreepNumber = Object.keys(Game.creeps).length
    // 本 tick creep 数量没变，不用执行检查
    if (nowGameCreepNumber === lastGameCreepNumber) {
        lastGameCreepNumber = nowGameCreepNumber
        return
    }

    // 遍历所有 creep 内存，检查其是否存在
    for (const name in Memory.creeps) {
        if (name in Game.creeps) continue

        // creep 的内存不可能完全未空，所以这里只有可能是 creep 主动释放（比如去了其他 shard）
        // 所以这里不予重生
        if (Object.keys(Memory.creeps[name]).length <= 0) {
            // console.log(name, '离开了', Game.shard.name)
            delete Memory.creeps[name]
            continue
        }

        const creepMemory = Memory.creeps[name] as MyCreepMemory
        const { fromShard } = creepMemory

        // 有 fromShard 这个字段说明是跨 shard creep，只要不是自己 shard 的，统统发送跨 shard 重生任务
        // 有 fromShard 字段并且该字段又等于自己 shard 的名字，说明该跨 shard creep 死在了本 shard 的路上
        if (fromShard && fromShard !== Game.shard.name) {
            // console.log(`向 ${fromShard} 发送 sendRespawn 任务`, JSON.stringify({ name, memory: Memory.creeps[name] }))
            addCrossShardRequest(`respawnCreep ${name}`, fromShard, 'sendRespawn', {
                name, memory: creepMemory
            })

            delete Memory.creeps[name]
        }
        // 如果 creep 凉在了本 shard
        else handleNotExistCreep(name, creepMemory)
    }

    // 保存本 tick creep，供下个 tick 检查
    lastGameCreepNumber = nowGameCreepNumber
}

/**
 * creep 数量控制模块注册插件
 */
export const creepNumberControlAppPlugin: AppLifecycleCallbacks = {
    reset: () => {
        if (!Memory.creepConfigs) Memory.creepConfigs = {}
    },
    tickStart: creepNumberListener,
}