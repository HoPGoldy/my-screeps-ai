/**
 * Room 控制台交互
 *
 * 本文件包含了 Room 中用于控制台交互的方法
 */
import { getName, getUniqueKey, createHelp, red, yellow, blue, colorful } from '@/utils'
import { ModuleDescribe } from '@/utils/console/help/types'
import RoomExtension from './extension'
import { clearStructure, setBaseCenter } from '@/modulesGlobal/autoPlanning'
import { autoPlanner } from './autoPlanner'
import { WorkTaskType } from '@/modulesRoom'
import { WORK_TASK_PRIOIRY } from '@/modulesRoom/taskWork'
import { CreepRole } from '@/role/types/role'
import { DEFAULT_FLAG_NAME } from '@/utils/constants'
import { getRampart, getWall } from './shortcut'

// 在执行了第一次移除操作之后，玩家需要在多少 tick 内重新执行移除操作才能真正发起移除请求
const ROOM_REMOVE_INTERVAL = 30

export default class RoomConsole extends RoomExtension {
    /**
     * 有手动摆放工地时可以调用这个方法进行建造
     */
    public build (): string {
        this.work.updateTask({
            type: WorkTaskType.Build,
            priority: WORK_TASK_PRIOIRY.BUILD
        }, { dispath: true })
        let log = '已发布建筑任务'

        if (this.work.getUnit().length <= 0) {
            this.work.changeUnitNumber(1)
            log += '并添加工作单位'
        }

        return log
    }

    /**
     * 用户操作：将能量从 storage 转移至 terminal 里
     *
     * @param amount 要转移的能量数量, 默认 100k
     */
    public pute (amount = 100000): string {
        const addResult = this.transport.addTask({
            type: getUniqueKey(),
            requests: [{ from: this.storage.id, to: this.terminal.id, resType: RESOURCE_ENERGY, amount }]
        })
        return `已向 ${this.name} 物流推送能量转移任务，storage > terminal, 数量 ${amount}，当前排队位置: ${addResult}`
    }

    /**
     * 用户操作：将能量从 terminal 转移至 storage 里
     *
     * @param amount 要转移的能量数量, 默认全部转回来
     */
    public gete (amount: number = null): string {
        if (!this.terminal) return `未找到 ${this.name} 中的终端`
        if (amount === null) amount = this.terminal.store[RESOURCE_ENERGY]

        const addResult = this.transport.addTask({
            type: getUniqueKey(),
            requests: [{ from: this.terminal.id, to: this.storage.id, resType: RESOURCE_ENERGY, amount }]
        })
        return `已向 ${this.name} 物流推送能量转移任务，terminal > storage, 数量 ${amount}，当前排队位置: ${addResult}`
    }

    /**
     * 移除房间
     * 第一次执行时将会弹出警告
     * 玩家需要在指定时间内重新执行该 api 才会真正执行移除
     */
    public remove (): string {
        let log = '完成移除'
        // 没有发起过移除或者移除过期了，都视为第一次发起移除
        if (!this.memory.removeTime || Game.time > this.memory.removeTime + ROOM_REMOVE_INTERVAL) {
            log = [
                `${red('警告!', true)} 你正在试图移除房间 ${this.name}，这将会导致以下行为的发生：\n`,
                '- 移除所有建筑（不包括 wall、rempart、terminal 和 storage）',
                `- 移除所有相关 creep 及配置项（以 ${this.name} 作为名称前缀的 creep）`,
                '- 移除所有相关 memory（工作内存及统计内存）',
                `- ${colorful('不会', undefined, true)}转移房间中存放的资源，需要提前手动转移`,
                `\n在 ${ROOM_REMOVE_INTERVAL.toString()} tick 内重新执行 ${red(this.name + '.remove()')} 以确认移除，执行 ${yellow(this.name + '.cancelremove()')} 来取消操作`
            ].join('\n')
            this.memory.removeTime = Game.time
        }
        else this.dangerousRemove()
        return log
    }

    /**
     * 取消移除房间
     */
    public cancelremove (): string {
        delete this.memory.removeTime
        return '移除操作已取消'
    }

    /**
     * 用户操作 - 执行自动建筑规划
     */
    public planlayout (): string {
        return this.planLayout()
    }

    /**
     * 用户操作 - 设置中心点
     * @param flagName 中心点旗帜名
     */
    public setcenter (flagName: string): string {
        if (!flagName) flagName = getName.flagBaseCenter(this.name)
        const flag = Game.flags[flagName]

        if (!flag) return `[${this.name}] 未找到名为 ${flagName} 的旗帜`

        setBaseCenter(this, flag.pos)
        flag.remove()

        // 一级的时候移除所有非重要建筑
        if (this.controller.level === 1) clearStructure(this)

        // 设置好了之后自动运行布局规划
        autoPlanner.runStaticPlan(this, flag.pos)
        return `[${this.name}] 已将 ${flagName} 设置为中心点，controller 升级时自动执行布局规划`
    }

    /**
     * 移除所有不属于自己的墙壁
     */
    public clearwall (): string {
        // 找到所有不是自己的墙壁
        const wall = [...getWall(this), ...getRampart(this)].filter(s => !s.my)
        if (wall.length <= 0) return `[${this.name}] 未找到墙壁`

        wall.forEach(w => w.destroy())
        return `[${this.name}] 墙壁清理完成`
    }

    /**
     * 用户操作 - 房间操作帮助
     */
    public help (): string {
        const moduleList: ModuleDescribe[] = [
            {
                name: '房间帮助',
                describe: `以下是房间实例上可供调用的操作，调用方法名前要加房间名，如：${blue('W1N1.fhelp')}() 或者 ${blue('Game.rooms.W1N1.fhelp')}()`,
                api: []
            },
            {
                name: '资源调配 API',
                describe: '用于介入房间内部的资源流转或者向其他房间调配资源',
                api: [
                    {
                        title: '🪁 查看资源共享模块帮助',
                        functionName: 'sharehelp'
                    },
                    {
                        title: '新增 BUY 单',
                        describe: '订单的交易房为本房间',
                        params: [
                            { name: 'resourceType', desc: '要购买的资源类型' },
                            { name: 'price', desc: '单价' },
                            { name: 'totalAmount', desc: '总量' }
                        ],
                        functionName: 'buy'
                    },
                    {
                        title: '新增 SELL 单',
                        describe: '订单的交易房为本房间',
                        params: [
                            { name: 'resourceType', desc: '要卖出的资源类型' },
                            { name: 'price', desc: '单价' },
                            { name: 'totalAmount', desc: '总量' }
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
                    {
                        title: '孵化掠夺者',
                        params: [
                            { name: 'sourceFlagName', desc: `[可选] 要搜刮的建筑上插好的旗帜名，默认为 ${DEFAULT_FLAG_NAME.REIVER}` },
                            { name: 'targetStructureId', desc: '[可选] 要把资源存放到的建筑 id，默认为房间终端' }
                        ],
                        functionName: 'release.reiver'
                    }
                ]
            },
            {
                name: '建筑管控 API',
                describe: '用于管理房间中的建筑集群。',
                api: [
                    {
                        title: '🏭 查看 Factory 管理模块帮助',
                        functionName: 'fhelp'
                    },
                    {
                        title: '🚀 查看 Terminal 管理模块帮助',
                        functionName: 'thelp'
                    },
                    {
                        title: '⚗️ 查看 Lab 管理模块帮助',
                        functionName: 'lhelp'
                    },
                    {
                        title: '📦 查看 Storage 管理模块帮助',
                        functionName: 'shelp'
                    },
                    {
                        title: '👁️ 查看 Observer 管理模块帮助',
                        functionName: 'obhelp'
                    },
                    {
                        title: '💗 查看 PowerSpawn 模块帮助',
                        functionName: 'phelp'
                    }
                ]
            },
            {
                name: '房间管理 API',
                describe: '包含本房间的对外扩张、内部管理等操作。',
                api: [
                    {
                        title: '🚩 查看扩张模块帮助',
                        functionName: 'rhelp'
                    },
                    {
                        title: '运行建筑布局',
                        describe: '本方法依赖于 setcenter 方法，已自动化，默认在 controller 升级时调用',
                        functionName: 'planlayout'
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
                        title: '🗑️ 移除本房间',
                        describe: '会移除房间内的建筑（不包括墙壁）、移除对应的 creep 及 memory，需二次确认',
                        functionName: 'remove'
                    }
                ]
            }
        ]
        return createHelp(...moduleList)
    }
}
