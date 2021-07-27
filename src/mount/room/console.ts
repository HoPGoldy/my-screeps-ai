/**
 * Room 控制台交互
 * 
 * 本文件包含了 Room 中用于控制台交互的方法
 */

import { createHelp, Color, colorful } from '@/modulesGlobal/console'
import { DEFAULT_FLAG_NAME, labTarget, LAB_STATE, ROOM_REMOVE_INTERVAL } from '@/setting'
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
     * 用户操作：初始化 lab 集群
     * 要提前放好名字为 lab1 和 lab2 的两个旗帜（放在集群中间的两个 lab 上）
     */
    public linit(): string {
         /**
         * 获取旗帜及兜底
         * @danger 这里包含魔法常量，若有需要应改写成数组形式
         */
        const lab1Flag = Game.flags['lab1']
        const lab2Flag = Game.flags['lab2']
        if (!lab1Flag || !lab2Flag) return `[lab 集群] 初始化失败，请在底物存放 Lab 上新建名为 [lab1] 和 [lab2] 的旗帜`
        if (lab1Flag.pos.roomName != this.name || lab2Flag.pos.roomName != this.name) return `[lab 集群] 初始化失败，旗帜不在本房间内，请进行检查`

        // 初始化内存, 之前有就刷新 id 缓存，没有就新建
        if (this.memory.lab) {
            this.memory.lab.inLab = []
        }
        else {
            this.memory.lab = {
                state: 'getTarget',
                targetIndex: 1,
                inLab: [],
                pause: false
            }
        }

        // 获取并分配 lab
        const labs = this.find<StructureLab>(FIND_MY_STRUCTURES, {
            filter: s => s.structureType == STRUCTURE_LAB
        })
        labs.forEach(lab => {
            if (lab.pos.isEqualTo(lab1Flag.pos) || lab.pos.isEqualTo(lab2Flag.pos)) this.memory.lab.inLab.push(lab.id)
        })

        lab1Flag.remove()
        lab2Flag.remove()

        return `[${this.name} lab] 初始化成功，稍后将自动运行生产规划`
    }

    /**
     * 用户操作：暂停 lab 集群
     */
    public loff(): string {
        if (!this.memory.lab) return `[${this.name} lab] 集群尚未初始化`
        this.memory.lab.pause = true
        return `[${this.name} lab] 已暂停工作`
    }

    /**
     * 用户操作：重启 lab 集群
     */
    public lon(): string {
        if (!this.memory.lab) return `[${this.name} lab] 集群尚未初始化`
        this.memory.lab.pause = false
        return `[${this.name} lab] 已恢复工作`
    }

    /**
     * 用户操作：显示当前 lab 状态
     */
    public lshow(): string {
        const memory = this.memory.lab
        if (!memory) return `[${this.name}] 未启用 lab 集群`
        const logs = [ `[${this.name}]` ]

        if (memory.pause) logs.push(colorful('暂停中', Color.Yellow))
        logs.push(`[状态] ${memory.state}`)

        // 获取当前目标产物以及 terminal 中的数量
        const res = labTarget[memory.targetIndex]
        const currentAmount = this.terminal ? this.terminal.store[res.target] : colorful('无法访问 terminal', Color.Red)

        // 在工作就显示工作状态
        if (memory.state === LAB_STATE.WORKING) {
            logs.push(`[工作进程] 目标 ${res.target} 剩余生产/当前存量/目标存量 ${memory.targetAmount}/${currentAmount}/${res.number}`)
        }

        return logs.join(' ')
    }

    /**
     * 用户操作 - 启动战争状态
     */
    public war(): string {
        let stats = `[${this.name}] `
        const result = this.startWar('WAR')

        if (result === OK) stats += `已启动战争状态，正在准备 boost 材料，请在准备完成后再发布角色组`
        else if (result === ERR_NAME_EXISTS) stats += '已处于战争状态'
        else if (result === ERR_NOT_FOUND) stats += `未找到名为 [${this.name}Boost] 的旗帜，请保证其周围有足够数量的 lab（至少 5 个）`
        else if (result === ERR_INVALID_TARGET) stats += '旗帜周围的 lab 数量不足，请移动旗帜位置'

        return stats
    }

    /**
     * 用户操作 - 取消战争状态
     */
    public nowar(): string {
        let stats = `[${this.name}] `
        const result = this.stopWar()

        if (result === OK) stats += `已解除战争状态，boost 强化材料会依次运回 Terminal`
        else if (result === ERR_NOT_FOUND) stats += `未启动战争状态`

        return stats
    }

    /**
     * 用户操作 - 拓展新外矿
     * 
     * @param 同上 addRemote()
     */
    public radd(remoteRoomName: string, targetId: Id<StructureWithStore>): string {
        let stats = `[${this.name} 外矿] `

        const actionResult = this.addRemote(remoteRoomName, targetId)
        if (actionResult === OK) stats += '拓展完成，已发布 remoteHarvester 及 reserver'
        else if (actionResult === ERR_INVALID_TARGET) stats += '拓展失败，无效的 targetId'
        else if (actionResult === ERR_NOT_FOUND) stats += `拓展失败，未找到 source 旗帜，请在外矿房间的 source 上放置名为 [${remoteRoomName} source0] 的旗帜（有多个 source 请依次增加旗帜名最后一位的编号）`
        
        return stats
    }

    /**
     * 用户操作 - 移除外矿
     * 
     * @param 同上 removeRemote()
     */
    public rremove(remoteRoomName: string, removeFlag: boolean = false): string {
        let stats = `[${this.name} 外矿] `

        const actionResult = this.removeRemote(remoteRoomName, removeFlag)
        if (actionResult === OK) stats += '外矿及对应角色组已移除，' + (removeFlag ? 'source 旗帜也被移除' : 'source 旗帜未移除')
        else if (actionResult === ERR_NOT_FOUND) stats += '未找到对应外矿'
        
        return stats
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
     * 用户操作 - 占领新房间
     * 
     * @param 同上 claimRoom()
     */
    public claim(targetRoomName: string, signText: string = ''): string {
        this.claimRoom(targetRoomName, signText)

        return `[${this.name} 拓展] 已发布 claimer，请保持关注，支援单位会在占领成功后自动发布。` +
        `你可以在目标房间中新建名为 ${getName.flagBaseCenter(targetRoomName)} 的旗帜来指定基地中心。否则 claimer 将运行自动规划。`
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
                name: '房间拓展 API',
                describe: '用于执行本房间的对外扩张计划',
                api: [
                    {
                        title: '拓展新外矿',
                        params: [
                            { name: 'remoteRoomName', desc: '要拓展的外矿房间名' },
                            { name: 'targetId', desc: '能量应搬运到哪个建筑的 id' }
                        ],
                        functionName: 'radd'
                    },
                    {
                        title: '移除外矿',
                        params: [
                            { name: 'remoteRoomName', desc: '要移除的外矿房间名' },
                            { name: 'removeFlag', desc: '是否顺便把外矿 source 上的旗帜也移除了' }
                        ],
                        functionName: 'rremove'
                    },
                    {
                        title: '占领新房间',
                        params: [
                            { name: 'targetRoomName', desc: '要占领的房间名' },
                            { name: 'signText', desc: '[可选] 新房间的签名，默认为空' },
                        ],
                        functionName: 'claim'
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