import { addCrossShardRequest } from '@/modulesGlobal/crossShard'
import { log } from '@/utils'
import roles from '@/role'

/**
 * creep 的数量控制器
 * 负责发现死去的 creep 并检查其是否需要再次孵化
 * 
 * @param intrval 搜索间隔
 */
export const creepNumberListener = function (): void {
    // 本 tick creep 数量没变，不用执行检查
    if (Object.keys(Memory.creeps || {}).length === Object.keys(Game.creeps).length) return

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
    const { spawnRoom: spawnRoomName, data, role, cantRespawn, taskKey } = creepMemory

    // 如果有 taskKey，说明还在做任务，去访问对应的任务管理器把自己注销一下 
    if (taskKey) removeSelfFromTask(creepName, role, data)

    // 禁止孵化的 creep 直接移除
    if (cantRespawn) {
        log(`死亡 ${creepName} 被禁止孵化, 已删除`, [ 'creepController' ])
        delete Memory.creeps[creepName]
        return
    }

    // 检查指定的 room 中有没有它的生成任务
    const spawnRoom = Game.rooms[spawnRoomName]
    if (!spawnRoom) {
        log(`死亡 ${creepName} 未找到 ${spawnRoomName}, 已删除`, [ 'creepController' ])
        delete Memory.creeps[creepName]
        return
    }

    const creepWork: CreepConfig<CreepRoleConstant> = roles[role]

    // 通过 isNeed 阶段判断该 creep 是否要继续孵化
    // 没有提供 isNeed 阶段的话则默认需要重新孵化
    if (creepWork.isNeed && !creepWork.isNeed(spawnRoom, creepMemory)) {
        delete Memory.creeps[creepName]
        return
    }

    // 加入生成，加入成功的话删除过期内存
    const result = spawnRoom.spawner.addTask({ name: creepName, role, data })

    if (result === ERR_NAME_EXISTS) log(`死亡 ${creepName} 孵化任务已存在`, [ 'creepController' ])
    delete Memory.creeps[creepName]
}

/**
 * 通知对应的房间任务管理器，他的一个工人凉了
 * 
 * @param creepName 正在做任务的 creep 名字
 * @param role 该 creep 的角色
 * @param data 该 creep 的 memory.data
 */
const removeSelfFromTask = function (creepName: string, role: CreepRoleConstant, data: CreepData): void {
    if (!('workRoom' in data)) return

    const workRoom = Game.rooms[data.workRoom]
    if (!workRoom) return

    const controller = role === 'manager' ? workRoom.transport : workRoom.work
    controller.removeCreep(creepName)
}