import { creepConfigs } from './config.creep'
import { updateState } from './utils'

export function creepWork(): void {
    for (const creepName in Game.creeps) {
        singleCreepWork(Game.creeps[creepName])
    }
}

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
    if (working) creep[creepConfig.target.func](...creepConfig.target.args)
    else creep[creepConfig.source.func](...creepConfig.source.args)
}