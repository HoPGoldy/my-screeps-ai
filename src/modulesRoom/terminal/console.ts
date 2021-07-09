import TerminalExtension from "./controller"
import { colorful } from '@/utils'
import { createForm, createHelp } from '@/modulesGlobal/console'
import { TerminalChannel, TerminalMode } from "./constant"
import { unstringifyTask } from "./utils"

/**
 * Terminal 上的用户控制接口
 */
export default class TerminalConsole extends Room {
    /**
     * 添加终端监听任务
     */
    public gtadd(): string { 
        return createForm('terminalAdd', [
            { name: 'resourceType', label: '资源类型', type: 'input', placeholder: '资源的实际值' },
            { name: 'amount', label: '期望值', type: 'input', placeholder: '交易策略的触发值' },
            { name: 'priceLimit', label: '[可选]价格限制', type: 'input', placeholder: '置空该值以启动价格检查' },
            { name: 'mod', label: '物流方向', type: 'select', options: [
                { value: '0', label: '获取' },
                { value: '1', label: '提供' }
            ]},
            { name: 'channel', label: '物流渠道', type: 'select', options: [
                { value: '0', label: '拍单' },
                { value: '1', label: '挂单' },
                { value: '2', label: '共享' },
                { value: '3', label: '支援' }
            ]},
            { name: 'supportRoomName', label: '[可选]支援房间', type: 'input', placeholder: 'channel 为支援时必填' },
        ], {
            content: '提交',
            command: `({resourceType, amount, mod, channel, priceLimit, supportRoomName}) => Game.rooms['${this.name}'].terminal.add(resourceType, amount, mod, channel, priceLimit, supportRoomName)`
        })
    }

    /**
     * 添加终端监听任务
     */
    public tadd(
        resourceType: ResourceConstant,
        amount: number,
        mod: TerminalMode = TerminalMode.Get,
        channel: TerminalChannel = TerminalChannel.Take,
        priceLimit: number = undefined
    ): string { 
        if (!this.terminal) return `[${this.name}] 未找到终端`
        if (!_.isNumber(priceLimit)) priceLimit = undefined

        this.myTerminal.addTask(resourceType, amount, mod, channel, priceLimit)
        return `已添加，当前监听任务如下: \n${this.myTerminal.show()}`
    }

    /**
     * 移除资源监听任务
     */
    public tremove(index: number): string { 
        if (!this.terminal) return `[${this.name}] 未找到终端`

        this.myTerminal.removeTask(index) 
        return `已移除，当前监听任务如下:\n${this.myTerminal.show()}`
    }

    /**
     * 显示终端当前监听任务
     */
    public tshow(): string {
        if (!this.terminal) return `[${this.name}] 未找到终端`
        return this.myTerminal.show()
    }

    /**
     * 将终端监听设置为默认值
     * 
     * @param hard 设为 true 来移除其默认值中不包含的监听资源
     */
    public treset(hard: boolean = false): string {
        this.myTerminal.resetConfig(hard);
        return `已重置，当前监听任务如下:\n${this.myTerminal.show()}`
    }

    public thelp(): string {
        return createHelp({
            name: 'Terminal 控制台',
            describe: '通过设置监听规则来自动化管理多房间共享、对外交易等资源物流工作',
            api: [
                {
                    title: '添加资源监听',
                    describe: '新增期望值和交易规则，terminal 会自动对其监听并维持期望',
                    params: [
                        { name: 'resourceType', desc: '终端要监听的资源类型(只会监听自己库存中的数量)' },
                        { name: 'amount', desc: '指定类型的期望数量' },
                        { name: 'mod', desc: '[可选] 监听类型，分为 0(获取，默认), 1(对外提供)' },
                        { name: 'channel', desc: '[可选] 渠道，分为 0(拍单，默认), 1(挂单), 2(共享)，3(支援)'},
                        { name: 'priceLimit', desc: '[可选] 价格限制，若不填则通过历史平均价格检查'},
                        { name: 'supportRoomName', desc: '[可选] 要支援的房间名，在 channel 为 3 时生效'}
                    ],
                    functionName: 'tadd'
                },
                {
                    title: 'GUI - 添加资源监听',
                    functionName: 'gtadd'
                },
                {
                    title: '移除资源监听',
                    describe: '该操作会自动从 storage 里取出能量',
                    params: [
                        { name: 'index', desc: '移除监听的任务索引' }
                    ],
                    functionName: 'tremove'
                },
                {
                    title: '列出所有监听任务',
                    functionName: 'tshow'
                },
                {
                    title: '重设默认监听',
                    params: [
                        { name: 'hard', desc: '[可选] 将移除非默认的监听任务，默认为 false' }
                    ],
                    functionName: 'treset'
                }
            ]
        })
    }
}