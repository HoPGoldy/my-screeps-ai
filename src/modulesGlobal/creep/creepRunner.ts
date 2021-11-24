import roles from '@/role'
import { getMemoryFromCrossShard } from '@/modulesGlobal/crossShard'
import { Color } from '@/modulesGlobal/console'
import { CreepConfig, CreepRole } from '@/role/types/role'

/**
 * 运行 creep 工作逻辑
 */
export const runCreep = function (creep: Creep): void {
    if (!creep.memory.role) return

    // 检查 creep 内存中的角色是否存在
    if (!(creep.memory.role in roles)) {
        // 没有的话可能是放在跨 shard 暂存区了
        const memory = getMemoryFromCrossShard(creep.name)
        // console.log(`${creep.name} 从暂存区获取了内存`, memory)
        if (!memory) {
            creep.log('找不到对应内存', Color.Yellow)
            creep.say('我凉了！')
            return
        }
    }

    // 还没出生就啥都不干
    if (creep.spawning) return

    // 获取对应配置项
    const creepConfig: CreepConfig<CreepRole> = roles[creep.memory.role]

    // 没准备的时候就执行准备阶段
    if (!creep.memory.ready) {
        // 有准备阶段配置则执行
        if (creepConfig.prepare) creep.memory.ready = creepConfig.prepare(creep)
        // 没有就直接准备完成
        else creep.memory.ready = true
    }

    // 如果执行了 prepare 还没有 ready，就返回等下个 tick 再执行
    if (!creep.memory.ready) return

    // 获取是否工作，没有 source 的话直接执行 target
    const working = creepConfig.source ? creep.memory.working : true

    let stateChange = false
    // 执行对应阶段
    // 阶段执行结果返回 true 就说明需要更换 working 状态
    if (working) {
        if (creepConfig.target && creepConfig.target(creep)) stateChange = true
    }
    else {
        if (creepConfig.source && creepConfig.source(creep)) stateChange = true
    }

    // 状态变化了就释放工作位置
    if (stateChange) {
        creep.memory.working = !creep.memory.working
        if (creep.memory.stand) delete creep.memory.stand
    }
}
