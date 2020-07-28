import TerminalExtension from "./extension"
import { createHelp, colorful } from 'utils'
import { terminalModes, terminalChannels } from "setting"

/**
 * Terminal 上的用户控制接口
 */
export default class TerminalConsole extends TerminalExtension {
    /**
     * 用户操作 - 添加资源监听
     */
    public add(resourceType: ResourceConstant, amount: number, mod: TerminalModes = 0, channel: TerminalChannels = 0, priceLimit: number = undefined) {
        if (!_.isNumber(priceLimit)) priceLimit = undefined
        
        this.addTask(resourceType, amount, mod, channel, priceLimit)
        return `已添加，当前监听任务如下: \n${this.show()}`
    }

    /**
     * 用户操作 - 移除资源监听任务
     */
    public remove(index: number): string {
        this.removeTask(index) 
        return `已移除，当前监听任务如下:\n${this.show()}`
    }

    /**
     * 用户操作：将终端监听设置为默认值
     * 
     * @param hard 设为 true 来移除其默认值中不包含的监听资源
     */
    public reset(hard: boolean = false): string {
        // 要添加的默认资源
        const defaultResource = [ RESOURCE_OXYGEN, RESOURCE_HYDROGEN, RESOURCE_KEANIUM, RESOURCE_LEMERGIUM, RESOURCE_UTRIUM, RESOURCE_ZYNTHIUM, RESOURCE_CATALYST]

        if (hard) this.room.memory.terminalTasks = []
        this.room.memory.terminalIndex = 0

        // 默认选项为从资源共享协议获取所有的基础元素各 5000
        defaultResource.forEach(res => this.add(res, 5000, terminalModes.get, terminalChannels.share))

        return `已重置，当前监听任务如下:\n${this.show()}`
    }

    /**
     * 显示所有终端监听任务
     */
    public show(): string {
        if (!this.room.memory.terminalTasks) return '该房间暂无终端监听任务'

        const tasks = this.room.memory.terminalTasks
        const currentIndex = this.room.memory.terminalIndex

        // 从 code 转换为介绍，提高可读性
        const channelIntroduce: { [action in TerminalChannels]: string } = {
            [terminalChannels.take]: '拍单',
            [terminalChannels.release]: '挂单',
            [terminalChannels.share]: '共享'
        }
        const modeIntroduce: { [action in TerminalModes]: string } = {
            [terminalModes.get]: 'get',
            [terminalModes.put]: 'put'
        }

        // 遍历所有任务绘制结果
        return tasks.map((taskStr, index) => {
            const task = this.unstringifyTask(taskStr)
            let logs = [
                `[${index}] ${colorful(task.type, 'blue')}`,
                `[当前/期望] ${this.room.terminal.store[task.type]}/${task.amount}`,
                `[类型] ${modeIntroduce[task.mod]}`,
                `[渠道] ${channelIntroduce[task.channel]}`
            ]
            if (task.priceLimit) logs.push(`[价格${task.mod === terminalModes.get ? '上限' : '下限'}] ${task.priceLimit}`)
            if (index === currentIndex) logs.push(`< 正在检查`)
            return '  ' + logs.join(' ')
        }).join('\n')
    }

    public help(): string {
        return createHelp([
            {
                title: '添加资源监听',
                params: [
                    { name: 'resourceType', desc: '终端要监听的资源类型(只会监听自己库存中的数量)' },
                    { name: 'amount', desc: '指定类型的期望数量' },
                    { name: 'mod', desc: '[可选] 监听类型，分为 0(获取，默认), 1(对外提供)' },
                    { name: 'channel', desc: '[可选] 渠道，分为 0(拍单，默认), 1(挂单), 2(共享)'},
                    { name: 'priceLimit', desc: '[可选] 价格限制，若不填则通过历史平均价格检查'}
                ],
                functionName: 'add'
            },
            {
                title: '移除资源监听',
                params: [
                    { name: 'index', desc: '移除监听的任务索引' }
                ],
                functionName: 'remove'
            },
            {
                title: '列出所有监听任务',
                functionName: 'show'
            },
            {
                title: '重设默认监听',
                params: [
                    { name: 'hard', desc: '[可选] 将移除非默认的监听任务，默认为 false' }
                ],
                functionName: 'reset'
            },
        ])
    }
}