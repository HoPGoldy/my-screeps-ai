import { creepConfigs } from './config.creep'
import { updateState } from './utils'


/**
 * creep 执行任务主入口, 流程如下:
 *   1. 遍历每一个 creep
 *   2. 更新自己的状态
 *   3. 执行角色配置项的任务
 *   4. 健康检查, 不行就发重生任务
 */
export default function (): void {
    for (const creepName in Game.creeps) {
        singleCreepWork(Game.creeps[creepName])
    }
}

/**
 * 让每个 creep 动起来
 * 
 * @param creep 
 * @returns {boolean} creep 角色异常则返回 false, 其他返回 true
 */
function singleCreepWork(creep: Creep): boolean {
    // 检查 creep 内存中的角色是否存在
    if (!(creep.memory.role in creepConfigs)) {
        console.log(`creep ${creep.name} 内存属性 role 不属于任何已存在的 creepConfigs 名称`)
        return false
    }
    // 获取对应配置项
    const creepConfig: ICreepConfig = creepConfigs[creep.memory.role]
    // 获取是否工作
    const working = updateState(creep)

    // 执行对应操作
    if (working) {
        creepConfig.target.map(action => {
            creep[action.func](...action.args)
        })
    }
    else {
        creepConfig.source.map(action => {
            creep[action.func](...action.args)
        })
    }

    // 如果 creep 还没有发送重生信息的话，执行健康检查
    // 健康检查不通过则向 spawnList 发送自己的生成任务
    if (!creep.memory.hasSendRebirth) {
        const health: boolean = isCreepHealth(creep)
        if (!health) {
            Memory.spawnList.push(creep.memory.role)
            creep.memory.hasSendRebirth = true
        } 
    }
}

/**
 * creep 健康检查, 条件如下:
 *   1. 剩余时间小于10
 *   2. 生命值低于一半
 * 
 * @param creep 
 * @returns {boolean} 健康就返回 true, 不健康返回 false
 */
function isCreepHealth(creep: Creep): boolean {
    if (creep.ticksToLive <= 10 || creep.hits < creep.hitsMax / 2) return false
    else return true
}