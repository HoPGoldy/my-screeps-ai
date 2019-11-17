import { creepConfigs } from './config'
import { resourcesHelp } from './setting'
import { createHelp } from './utils'

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
    },
    {
        alias: 'resource',
        exec: function(): string {
            return resourcesHelp
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
     * 资源共享协议 CLI 工具
     */
    share: {
        /**
         * 添加新的共享任务
         * 当 target房间终端中的资源数量低于 amount 时触发转移任务
         * 
         * @param source 资源提供房间名
         * @param target 资源接受房间名
         * @param resourceType 资源类型
         * @param amount 要维持的资源数量
         */
        add(source: string, target: string, resourceType: ResourceConstant, amount: number): string {
            this.includeCheck()

            Memory.roomShare.tasks.push({
                source,
                target,
                resourceType,
                amount
            })

            return '添加成功，当前所有共享任务如下：\n' + this.show()
        },

        /**
         * 显示当前所有的共享任务及 id
         */
        show(): string {
            this.includeCheck()

            if (Memory.roomShare.tasks.length > 0) {
                return Memory.roomShare.tasks.map((task, index) => `[${index}] ${task.source} > ${task.target} 资源: ${task.resourceType} 维持数量 ${task.amount}`).join('\n')
            }
            else return '暂无共享任务'
        },

        /**
         * 使用任务的 id 删除该任务
         * 
         * @param taskId 要移除的任务 id
         */
        remove(taskId: number): string {
            this.includeCheck()

            // 检查用户输入是否可靠
            if (Memory.roomShare.tasks.length < taskId) return `没有找到指定的任务, 删除未执行`

            // 移除任务
            Memory.roomShare.tasks.splice(taskId, 1)

            return `移除成功，当前剩余的共享任务如下：\n` + this.show()
        },

        /**
         * 根据任务 id 重设该任务
         * 
         * @param taskId 要重设的任务 id
         * @param source 资源提供房间名
         * @param target 资源接受房间名
         * @param resourceType 资源类型
         * @param amount 要维持的资源数量
         */
        set(taskId, source, target, resourceType, amount): string {
            this.includeCheck()

            // 检查用户输入是否可靠
            if (Memory.roomShare.tasks.length >= taskId) return `没有找到指定的任务`

            Memory.roomShare.tasks[taskId] = {
                source,
                target,
                resourceType,
                amount
            }

            return `重设成功，当前所有的共享任务如下：\n` + this.show()
        },

        /**
         * 用户操作：帮助
         */
        help(): string {
            return createHelp([
                {
                    title: '添加新共享任务',
                    params: [
                        { name: 'source', desc: '资源的提供房间名' },
                        { name: 'target', desc: '资源的接收房间名' },
                        { name: 'resourceType', desc: '共享的资源类型' },
                        { name: 'amount', desc: '要维持的数量' },
                    ],
                    functionName: 'add'
                },
                {
                    title: '显示当前所有的任务及其 id',
                    functionName: 'show'
                },
                {
                    title: '使用 id 删除任务',
                    params: [
                        { name: 'taskId', desc: '要删除的任务 id ' }
                    ],
                    functionName: 'remove'
                },
                {
                    title: '使用 id 重新设置任务',
                    params: [
                        { name: 'taskId', desc: '要重设的任务 id ' },
                        { name: 'source', desc: '资源的提供房间名' },
                        { name: 'target', desc: '资源的接收房间名' },
                        { name: 'resourceType', desc: '共享的资源类型' },
                        { name: 'amount', desc: '要维持的数量' },
                    ],
                    functionName: 'set'
                }
            ])
        },

        /**
         * 检查 Memory 中是否包含所需数据对象
         * 没有则新建
         */
        includeCheck(): void {
            if (!Memory.roomShare) Memory.roomShare = {
                tasks: []
            }
        }
    }
}