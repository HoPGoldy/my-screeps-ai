import { creepConfigs } from './config.creep'

// 挂载全局拓展
export default function () {
    funcAlias.map(item => {
        Object.defineProperty(global, item.alias, { get: globalExtension[item.funcName] })
    })
}

/**
 * 全局拓展的别名
 * @property {string} alias 别名
 * @property {string} funcName 执行别名时触发的 globalExtension 中的方法名
 */
const funcAlias = [
    { alias: 'reload', funcName: 'reloadConfig' }
]

// 全局拓展对象
export const globalExtension = {
    /**
     * 从 config.creep 中重新应用配置
     */
    reloadConfig(): string {
        // 收集所有存活中的 creep 角色
        let aliveCreepRoles: string[] = []
        let missCreep: string[] = []
        for (const creepName in Game.creeps) {
            aliveCreepRoles.push(Game.creeps[creepName].memory.role)
        }
        // 遍历 creepConfigs 的 name 进行检查
        for (const configName in creepConfigs) {
            // 配置项 creep 已存活
            if (_.find(aliveCreepRoles, role => role == configName)) continue
            // 配置项 creep 没存活但是在待生成队列里
            else if (_.find(Memory.spawnList, role => role == configName)) continue
            // 配置项缺失, 加入待生成队列
            else {
                Memory.spawnList.push(configName)
                missCreep.push(configName)
            }
        }
        return missCreep.length > 0 ? `发现缺失的 creep 如下: ${missCreep.join(', ')}。 已加入生成队列` : '未发现缺失 creep 干得好!'
    }
}