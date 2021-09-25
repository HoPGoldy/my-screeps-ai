/**
 * Room 控制台交互
 * 
 * 本文件包含了 Room 中用于控制台交互的方法
 */

import { createHelp, Color, colorful } from '@/modulesGlobal/console'
import { DEFAULT_FLAG_NAME, ROOM_REMOVE_INTERVAL } from '@/setting'
import { getName } from '@/utils'
import { setBaseCenter } from '@/modulesGlobal/autoPlanning/planBasePos'
import RoomExtension from './extension'
import { manageStructure } from '@/modulesGlobal/autoPlanning'
import { ModuleDescribe } from '@/modulesGlobal/console/help/types'
import { CenterStructure } from '@/modulesRoom/taskCenter/types'
import { WorkTaskType } from '@/modulesRoom'
import { WORK_TASK_PRIOIRY } from '@/modulesRoom/taskWork/constant'
import { CreepRole } from '@/role/types/role'

export default class RoomConsole extends RoomExtension {
    /**
     * 有手动摆放工地时可以调用这个方法进行建造
     */
    public build(): string {
        this.work.updateTask({
            type: WorkTaskType.Build,
            priority: WORK_TASK_PRIOIRY.BUILD
        }, { dispath: true })
        let log = '已发布建筑任务'

        if (Object.keys(this.work.creeps).length <= 0) {
            this.spawner.release.changeBaseUnit(CreepRole.Worker, 1)
            log += '并添加工作单位'
        }

        return log
    }

    /**
     * 用户操作：addCenterTask - 添加中央运输任务
     * 
     * @param targetId 资源存放建筑类型
     * @param sourceId 资源来源建筑类型
     * @param resourceType 要转移的资源类型
     * @param amount 资源数量
     */
    public ctadd(target: CenterStructure, source: CenterStructure, resourceType: ResourceConstant, amount: number): string {
        const addResult = this.centerTransport.addTask({
            submit: this.memory.centerTasks.length + new Date().getTime(),
            target,
            source,
            resourceType,
            amount
        })
        return `已向 ${this.name} 中央任务队列推送任务，当前排队位置: ${addResult}`
    }

    /**
     * 用户操作：将能量从 storage 转移至 terminal 里
     * 
     * @param amount 要转移的能量数量, 默认 100k
     */
    public pute(amount: number = 100000): string {
        const addResult = this.centerTransport.addTask({
            submit: this.centerTransport.tasks.length,
            target: CenterStructure.Terminal,
            source: CenterStructure.Storage,
            resourceType: RESOURCE_ENERGY,
            amount
        })
        return `已向 ${this.name} 中央任务队列推送能量转移任务，storage > terminal, 数量 ${amount}，当前排队位置: ${addResult}`
    }

    /**
     * 用户操作：将能量从 terminal 转移至 storage 里
     * 
     * @param amount 要转移的能量数量, 默认全部转回来
     */
    public gete(amount: number = null): string {
        if (!this.terminal) return `未找到 ${this.name} 中的终端`
        if (amount === null) amount = this.terminal.store[RESOURCE_ENERGY]
        
        const addResult = this.centerTransport.addTask({
            submit: this.centerTransport.tasks.length,
            target: CenterStructure.Storage,
            source: CenterStructure.Terminal,
            resourceType: RESOURCE_ENERGY,
            amount
        })
        return `已向 ${this.name} 中央任务队列推送能量转移任务，terminal > storage, 数量 ${amount}，当前排队位置: ${addResult}`
    }

    /**
     * 移除房间
     * 第一次执行时将会弹出警告
     * 玩家需要在指定时间内重新执行该 api 才会真正执行移除
     */
    public remove(): string {
        let log = '完成移除'
        // 没有发起过移除或者移除过期了，都视为第一次发起移除
        if (!this.memory.removeTime || Game.time > this.memory.removeTime + ROOM_REMOVE_INTERVAL) {
            log = [
                `${colorful('警告!', Color.Red, true)} 你正在试图移除房间 ${this.name}，这将会导致以下行为的发生：\n`,
                `- 移除所有建筑（不包括 wall、rempart、terminal 和 storage）`,
                `- 移除所有相关 creep 及配置项（以 ${this.name} 作为名称前缀的 creep）`,
                `- 移除所有相关 memory（工作内存及统计内存）`,
                `- ${colorful('不会', undefined, true)}转移房间中存放的资源，需要提前手动转移`,
                `\n在 ${ROOM_REMOVE_INTERVAL.toString()} tick 内重新执行 ${colorful(this.name + '.remove()', Color.Red)} 以确认移除，执行 ${colorful(this.name + '.cancelremove()', Color.Yellow)} 来取消操作`
            ].join('\n')
            this.memory.removeTime = Game.time
        }
        else this.dangerousRemove()
        return log
    }

    /**
     * 取消移除房间
     */
    public cancelremove(): string {
        delete this.memory.removeTime
        return `移除操作已取消`
    }

    /**
     * 用户操作 - 执行自动建筑规划
     */
    public planlayout(): string {
        return this.planLayout()
    }

    /**
     * 用户操作 - 设置中心点
     * @param flagName 中心点旗帜名
     */
    public setcenter(flagName: string): string {
        if (!flagName) flagName = getName.flagBaseCenter(this.name)
        const flag = Game.flags[flagName]

        if (!flag) return `[${this.name}] 未找到名为 ${flagName} 的旗帜`

        setBaseCenter(this, flag.pos)
        flag.remove()
        // 设置好了之后自动运行布局规划
        manageStructure(this)
        return `[${this.name}] 已将 ${flagName} 设置为中心点，controller 升级时自动执行布局规划`
    }

    /**
     * 移除所有不属于自己的墙壁
     */
    public clearwall(): string {
        // 找到所有不是自己的墙壁
        const wall = [...this[STRUCTURE_WALL], ...this[STRUCTURE_RAMPART]].filter(s => !s.my)
        if (wall.length <= 0) return `[${this.name}] 未找到墙壁`

        wall.forEach(w => w.destroy())
        return `[${this.name}] 墙壁清理完成`
    }
    
    /**
     * 用户操作 - 房间操作帮助
     */
    public help(): string {
        const moduleList: ModuleDescribe[] = [
            {
                name: '资源调配 API',
                describe: '用于介入房间内部的资源流转或者向其他房间调配资源',
                api: [
                    {
                        title: '添加中央运输任务',
                        params: [
                            { name: 'targetType', desc: '资源存放建筑类型，STRUCTURE_FACTORY STRUCTURE_STORAGE STRUCTURE_TERMINAL 之一' },
                            { name: 'sourceType', desc: '资源来源建筑类型，同上' },
                            { name: 'resourceType', desc: '要转移的资源类型' },
                            { name: 'amount', desc: '要转移的数量' },
                        ],
                        functionName: 'ctadd'
                    },
                    {
                        title: '发送能量',
                        describe: '该操作会自动从 storage 里取出能量',
                        params: [
                            { name: 'roomName', desc: '要发送到的房间名' },
                            { name: 'amount', desc: '[可选] 要转移的能量数量, 默认 100k' }
                        ],
                        functionName: 'givee'
                    },
                    {
                        title: '发送资源',
                        params: [
                            { name: 'roomName', desc: '要发送到的房间名' },
                            { name: 'resourceType', desc: '要发送的资源类型' },
                            { name: 'amount', desc: '[可选] 要转移的能量数量, 默认 1k' }
                        ],
                        functionName: 'giver'
                    },
                    {
                        title: '移出能量',
                        describe: '将能量从 storage 转移至 terminal 里',
                        params: [
                            { name: 'amount', desc: '[可选] 要转移的能量数量, 默认 100k' }
                        ],
                        functionName: 'pute'
                    },
                    {
                        title: '移入能量',
                        describe: '将能量从 terminal 转移至 storage 里',
                        params: [
                            { name: 'amount', desc: '[可选] 要转移的能量数量, 默认 100k' }
                        ],
                        functionName: 'gete'
                    },
                    {
                        title: '新增 BUY 单',
                        describe: '订单的交易房为本房间',
                        params: [
                            { name: 'resourceType', desc: '要购买的资源类型' },
                            { name: 'price', desc: '单价' },
                            { name: 'totalAmount', desc: '总量' },
                        ],
                        functionName: 'buy'
                    },
                    {
                        title: '新增 SELL 单',
                        describe: '订单的交易房为本房间',
                        params: [
                            { name: 'resourceType', desc: '要卖出的资源类型' },
                            { name: 'price', desc: '单价' },
                            { name: 'totalAmount', desc: '总量' },
                        ],
                        functionName: 'sell'
                    },
                    {
                        title: '拍下订单',
                        params: [
                            { name: 'id', desc: '订单 id' },
                            { name: 'amount', desc: '[可选] 交易数量，默认为全部' }
                        ],
                        functionName: 'deal'
                    },
                ]
            },
            {
                name: '建筑管控 API',
                describe: '用于管理房间中的建筑集群，部分 API 继承自对应建筑原型。',
                api: [
                    {
                        title: '工厂状态',
                        describe: 'factory.stats 的别名',
                        functionName: 'fs'
                    },
                    {
                        title: '添加终端任务',
                        describe: 'terminal.add 的别名',
                        functionName: 'ta'
                    },
                    {
                        title: '移除终端任务',
                        describe: 'terminal.remove 的别名',
                        functionName: 'tr'
                    },
                    {
                        title: '显示终端任务',
                        describe: 'terminal.show 的别名',
                        functionName: 'ts'
                    },
                    {
                        title: '初始化 lab 集群',
                        functionName: 'linit'
                    },
                    {
                        title: '暂停 lab 集群',
                        functionName: 'loff'
                    },
                    {
                        title: '重启 lab 集群',
                        functionName: 'lon'
                    },
                    {
                        title: '显示 lab 集群状态',
                        functionName: 'lshow'
                    }
                ]
            },
            {
                name: '房间管理 API',
                describe: '包含本房间的一些基础接口，本模块的大多数 API 都已实现自动调用，除非房间运转出现问题，否则不需要手动进行调用。',
                api: [
                    {
                        title: '发布 creep',
                        describe: '发布房间运营需要的角色，已自动化',
                        params: [
                            { name: 'roleName', desc: 'BaseRoleConstant 和 AdvancedRoleConstant 中的所有角色名 (定义于 index.d.ts 中)' }
                        ],
                        functionName: 'releaseCreep'
                    },
                    {
                        title: '运行建筑布局',
                        describe: '本方法依赖于 setcenter 方法，已自动化，默认在 controller 升级时调用',
                        functionName: 'planLayout'
                    },
                    {
                        title: '设置基地中心点',
                        describe: '运行建筑自动布局依赖于本方法，已自动化，在 claim 新房间后会自动设置',
                        params: [
                            { name: 'flagName', desc: '中心点上的 flag 名称' }
                        ],
                        functionName: 'setcenter'
                    },
                    {
                        title: '移除墙壁',
                        describe: '移除本房间中所有墙壁 (包括非己方的 Rempart)',
                        functionName: 'clearwall'
                    },
                    {
                        title: '给本房间签名',
                        params: [
                            { name: 'content', desc: '要签名的内容' },
                            { name: 'targetRoomName', desc: '[可选] 要签名的房间名（默认为本房间）' }
                        ],
                        functionName: 'sign'
                    },
                    {
                        title: '移除本房间',
                        describe: '会移除房间内的建筑（不包括墙壁）、移除对应的 creep 及 memory，需二次确认',
                        functionName: 'remove'
                    }
                ]
            },
            {
                name: '战争 API',
                describe: '用于启动 / 执行 / 终止战争',
                api: [
                    {
                        title: '启动战争',
                        describe: '进入战争状态，会同步启动 boost 进程',
                        functionName: 'war'
                    },
                    {
                        title: '结束战争',
                        describe: '解除战争状态并回收 boost 材料',
                        functionName: 'nowar'
                    },
                    {
                        title: '孵化进攻单位',
                        describe: '孵化基础、无 boost 的红球单位',
                        params: [
                            { name: 'targetFlagName', desc: `[可选] 进攻旗帜名称，默认为 ${DEFAULT_FLAG_NAME.ATTACK}` },
                            { name: 'num', desc: '[可选] 要孵化的数量，1 - 10，默认为 1' }
                        ],
                        functionName: 'release.soldier'
                    },
                    {
                        title: '孵化拆除单位',
                        describe: '孵化基础、无 boost 、无 TOUGH 的黄球单位',
                        params: [
                            { name: 'targetFlagName', desc: `[可选] 进攻旗帜名称，默认为 ${DEFAULT_FLAG_NAME.ATTACK}` },
                            { name: 'num', desc: '[可选] 要孵化的数量，1 - 10，默认为 2' },
                            { name: 'keepSpawn', desc: '[可选] 是否持续生成，置为 true 时可以执行 creepApi.remove("creepName") 来终止持续生成，默认为 false' },
                        ],
                        functionName: 'release.dismantler'
                    },
                    {
                        title: '孵化进攻一体机',
                        describe: '<需要战争状态> 包含完全 boost 的蓝绿球单位',
                        params: [
                            { name: 'bearTowerNum', desc: '[可选] 抗塔等级 0-6，等级越高扛伤能力越强，伤害越低，默认为 6' },
                            { name: 'targetFlagName', desc: `[可选] 进攻旗帜名称，默认为 ${DEFAULT_FLAG_NAME.ATTACK}` },
                            { name: 'keepSpawn', desc: '[可选] 是否持续生成，置为 true 时可以执行 creepApi.remove("creepName") 来终止持续生成，默认为 false' },
                        ],
                        functionName: 'release.rangedAttacker'
                    },
                    {
                        title: '孵化拆墙小组',
                        describe: '<需要战争状态> 包含完全 boost 的黄球 / 绿球双人小组',
                        params: [
                            { name: 'targetFlagName', desc: `[可选] 进攻旗帜名称，默认为 ${DEFAULT_FLAG_NAME.ATTACK}` },
                            { name: 'keepSpawn', desc: '[可选] 是否持续生成，置为 true 时可以执行 creepApi.remove("creepName") 来终止持续生成，默认为 false' }
                        ],
                        functionName: 'release.dismantleGroup'
                    },
                    {
                        title: '孵化掠夺者',
                        params: [
                            { name: 'sourceFlagName', desc: `[可选] 要搜刮的建筑上插好的旗帜名，默认为 ${DEFAULT_FLAG_NAME.REIVER}` },
                            { name: 'targetStructureId', desc: `[可选] 要把资源存放到的建筑 id，默认为房间终端` }
                        ],
                        functionName: 'release.reiver'
                    }
                ]
            }
        ]
        return createHelp(...moduleList)
    }
}