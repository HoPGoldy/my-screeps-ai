import { creepConfigs } from './config'

// 挂载全局拓展
export default function () {
    // 挂载有别名的操作
    funcAlias.map(item => {
        Object.defineProperty(global, item.alias, { get: item.exec })
    })
    // 挂载没有别名的操作
    _.assign(global, globalExtension)
    // 把所有的房间挂载到全局
    mountRoomToGlobal()
}

/**
 * 把房间挂载到全局
 * 来方便控制台操作
 * 注意：本方法仅会挂载 Memory.rooms 里有的房间
 */
function mountRoomToGlobal() {
    for (const roomName in Memory.rooms) {
        // console.log('挂载', roomName)
        global[roomName] = Game.rooms[roomName]
    }
}

/**
 * 全局拓展的别名
 * 使用别名来方便在控制台执行方法
 * 
 * @property {string} alias 别名
 * @property {function} exec 执行别名时触发的操作
 */
const funcAlias = [
    {
        alias: 'reload', 
        /**
         * 从 config.creep 中重新应用配置
         */
        exec: function(): string {
            // 缺失的 creep 角色
            let missCreep: string[] = []
            // 收集所有存活中的 creep 角色
            let aliveCreepRoles: string[] = []
            for (const creepName in Game.creeps) {
                aliveCreepRoles.push(Game.creeps[creepName].memory.role)
            }
            // 遍历 creepConfigs 的 name 进行检查
            for (const configName in creepConfigs) {
                // 获取 spawn
                const spawn: StructureSpawn = Game.spawns[creepConfigs[configName].spawn]
                if (!spawn) {
                    console.log(`[reload 异常] ${configName} 配置项未找到指定的 ${creepConfigs[configName].spawn}`)
                    continue
                }

                // creep 存活
                if (_.find(aliveCreepRoles, role => role === configName)) continue
                // creep 没存活但是在待生成队列里
                else if (_.find(spawn.memory.spawnList, role => role === configName)) continue
                // 配置项缺失, 加入待生成队列
                else {
                    spawn.addTask(configName)
                    missCreep.push(configName)
                }
            }
            return missCreep.length > 0 ? `发现缺失的 creep 如下: ${missCreep.join(', ')}。 已加入生成队列` : '未发现缺失 creep, 干得好!'
        } 
    }
]

// 全局拓展对象
export const globalExtension = {
    /**
     * Game.getObjectById 的别名
     * 
     * @param id 游戏对象的 id
     */
    get: function(id: string): any {
        return Game.getObjectById(id)
    },
    
    /**
     * 给函数的显示添加一点小细节
     * 只会用在各种 help 方法中
     * 
     * @param functionInfo 函数的信息
     */
    createHelp: function(functionInfo: IFunctionDescribe[]): string {
        const functionList = functionInfo.map(func => {
            // 标题
            const title = `<text style="color: #6b9955">${func.title}</text>`
            // 参数介绍
            const param = func.params ? 
                func.params.map(param => `  - <text style="color: #8dc5e3">${param.name}</text>: <text style="color: #6b9955">${param.desc}</text>`).join('\n') : ''
            // 函数示例中的参数
            const paramInFunc = func.params ? 
                func.params.map(param => `<text style="color: #8dc5e3">${param.name}</text>`).join(', ') : ''
            // 函数示例
            const functionName = `<text style="color: #c5c599">${func.functionName}</text>(${paramInFunc})`

            return func.params ? `${title}\n${param}\n${functionName}\n` : `${title}\n${functionName}\n`
        })
        
        return functionList.join('\n')
    }
}