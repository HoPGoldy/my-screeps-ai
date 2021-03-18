/**
 * creep 控制模块
 * 
 * 负责 creep 的新增、删除及修改，creep 死后也会由该模块负责回收或再孵化
 * 更多细节 @see creep控制协议设计案.md
 */

import { addCrossShardRequest } from '@/modules/crossShard'
export { default as creepApi }  from './creepApi'
import { log } from '@/utils'
import roles from '@/role'
import creepApi from './creepApi'

/**
 * creep 的数量控制器
 * 负责发现死去的 creep 并检查其是否需要再次孵化
 * 
 * @param intrval 搜索间隔
 */
export default function creepNumberListener(): void {
    // 本 tick creep 数量没变，不用执行检查
    if (Object.keys(Memory.creeps).length === Object.keys(Game.creeps).length) return

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
}

/**
 * 处理去世的 creep
 * 会检查其是否需要再次孵化
 * 
 * @param creepName creep 名字
 * @param creepMemory creep 死时的内存
 */
const handleNotExistCreep = function (creepName: string, creepMemory: MyCreepMemory) {
    const creepConfig = Memory.creepConfigs[creepName]
    // 获取配置项
    if (!creepConfig) {
        log(`死亡 ${creepName} 未找到对应 creepConfig, 已删除`, [ 'creepController' ])
        delete Memory.creeps[creepName]
        return
    }

    // 检查指定的 room 中有没有它的生成任务
    const spawnRoom = Game.rooms[creepConfig.spawnRoom]
    if (!spawnRoom) {
        log(`死亡 ${creepName} 未找到 ${creepConfig.spawnRoom}, 已删除`, [ 'creepController' ])
        delete Memory.creeps[creepName]
        return
    }

    const creepWork: CreepConfig<CreepRoleConstant> = roles[creepConfig.role]

    // 通过 isNeed 阶段判断该 creep 是否要继续孵化
    // 没有提供 isNeed 阶段的话则默认需要重新孵化
    if (creepWork.isNeed && !creepWork.isNeed(spawnRoom, creepMemory)) {
        // creep 不需要了，遗弃该 creep
        creepApi.remove(creepName)
        delete Memory.creeps[creepName]
        return
    }

    // 加入生成，加入成功的话删除过期内存
    if (spawnRoom.spawner.addTask(creepName) != ERR_NAME_EXISTS) delete Memory.creeps[creepName]
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