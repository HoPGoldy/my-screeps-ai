import { creepConfigs } from './config.creep'

/**
 * 进行生产的主入口函数
 *   1. Memory.spawnList 中读取待生产列表
 *   2. 从 config.creep 中取出对应配置项并进行生产
 *   3. 移除已经完成的任务
 * 
 * @returns 没有 Memory.spawnList 返回 false, 其他返回 true
 */
export default function (): boolean {
    if (!hasSpawnList()) return false
    const spawnList: string[] = Memory.spawnList

    // 完成的任务索引，下面这个 for 执行完后会统一弹出完成的任务
    let complateSpawnIndexList: number[] = []
    
    // 循环队列中的任务并尝试完成
    for (let index = 0; index < spawnList.length; index++) {
        // 任务完成则加入完成列表
        if (singleSpawnWork(spawnList[index])) complateSpawnIndexList.push(index)
        // 未完成则进行下一个
        else break
    }

    // 移除已完成的任务, 从最后一个移除，不然会影响索引定位
    complateSpawnIndexList.reverse().forEach(index => Memory.spawnList.splice(index, 1))
    return true
}

/**
 * 检查生产队列是否可用
 * 
 * @returns {boolean} 可用返回 true, 不可用返回 false
 */
function hasSpawnList(): boolean {
    return Memory.spawnList ? true : false
}

/**
 * 从 spawn 生产 creep 
 * 
 * @param spawn 出生点
 * @param configName 对应的配置名称
 * @returns 开始生成返回 true, 否则返回 false
 */
function spawnCreep(spawn: StructureSpawn, configName: string): boolean {
    const creepConfig = creepConfigs[configName]

    const spawnResult = spawn.spawnCreep(creepConfig.bodys, configName + Game.time, {
        memory: {
            role: configName,
            working: false,
            hasSendRebirth: false
        }
    })
    // 检查是否生成成功
    if (spawnResult == OK) {
        console.log(`spawn ${creepConfig.spawn} 正在生成 ${configName} ...`)
        return true
    }
    else {
        console.log(`spawn ${creepConfig.spawn} 生成失败, 任务 ${configName} 挂起, 错误码 ${spawnResult}`)
        return false
    }
}

/**
 * 每个 spawnList 中的任务都要执行的生成
 * 
 * @param configName 任务的配置项名称
 * @returns 完成生成返回 true, 失败返回 false
 */
function singleSpawnWork(configName: string): boolean {
    // 获取队列中的 creep 配置项
    const creepConfig: ICreepConfig = creepConfigs[configName]
    // 检查 spawn 字段是否有对应的 spawn
    if (!(creepConfig.spawn in Game.spawns)) {
        console.log(`creepConfig - ${configName} spawn 名称异常`)
        return false
    }
    
    // 获取其 spawn
    const spawn: StructureSpawn = Game.spawns[creepConfig.spawn]
    // 检查是否生成中
    if (spawn.spawning) {
        console.log(`spawn ${creepConfig.spawn} 正在生成, 任务 ${configName} 挂起`)
        return false
    }

    // 生成 creep 并检查是否生成成功
    if (!spawnCreep(spawn, configName)) return false

    // 该任务正常完成！
    return true
}