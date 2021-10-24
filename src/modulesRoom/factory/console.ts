import { yellow, createHelp } from '@/modulesGlobal/console'

/**
 * Factory 上的用户控制接口
 */
export default class FactoryConsole extends Room {
    /**
     * 用户操作：设置工厂等级
     * 
     * @param level 等级
     */
    public fsetlevel(level: 1 | 2 | 3 | 4 | 5): string {
        const result = this.myFactory.setLevel(level)

        if (result === OK) return `[${this.name} factory] 已成功设置为 ${level} 级`
        else if (result === ERR_INVALID_ARGS) return `[${this.name} factory] 设置失败，请检查参数是否正确`
        else if (result === ERR_NAME_EXISTS) return `[${this.name} factory] 等级已锁定，请重建工厂后再次指定`
    }

    /**
     * 用户操作 - 批量设置生产线
     * 
     * @param depositTypes 要设置的生产线类型
     */
    public fsetchain(...depositTypes: DepositConstant[]): string {
        const result = this.myFactory.setChain(...depositTypes)

        if (result === OK) {
            const log = depositTypes.length > 0 ? `已成功设置为 ${depositTypes.join(', ')} 生产线` : '已清空生产线'
            return `[${this.name} factory] ${log}`
        }
        else if (result === ERR_INVALID_TARGET) {
            const command = yellow(`Game.rooms.${this.name}.factory.setlevel`)
            const help = yellow(`Game.rooms.${this.name}.factory.help`) + '()'
            return `[${this.name} factory] 设置失败，请先执行 ${command}, 查看 ${help} 获取更多帮助`
        }
    }

    /**
     * 用户操作 - 移除当前工厂配置
     */
    public fremove(): string {
        const actionResult = this.myFactory.remove()

        if (actionResult === ERR_NOT_FOUND) return `[${this.name} factory] 尚未启用`
        if (actionResult === OK) {
            const stopCommand = yellow(`delete Game.rooms.${this.name}.memory.factory.remove`)
            return `[${this.name} factory] 已启动废弃进程，正在搬出所有资源，执行 ${stopCommand} 以终止进程`
        }
    }

    /**
     * 用户操作 - 暂停 factory
     */
    public foff(): string {
        if (!this.memory.factory) return `[${this.name} factory] 未启用`
        this.memory.factory.pause = true
        return `[${this.name} factory] 已暂停`
    }

    /**
     * 用户操作 - 查看房间工作状态
     */
    public fs(): string {
        if (!this.factory) return `[${this.name}] 未建造工厂`
        return this.myFactory.stats()
    }

    /**
     * 用户操作 - 重启 factory
     * 会同时将工厂从停工中唤醒
     */
    public fon(): string {
        if (!this.memory.factory) return `[${this.name} factory] 未启用`
        delete this.memory.factory.pause
        this.myFactory.wakeup()
        return `[${this.name} factory] 已恢复, 当前状态：${this.myFactory.stats()}`
    }

    /**
     * 用户操作 - 手动指定生产目标
     * 
     * @param target 要生产的目标
     * @param clear 是否同时清理工厂之前的合成任务
     */
    public fset(target: CommodityConstant, clear: boolean = true): string {
        if (!this.memory.factory) this.myFactory.initMemory()
        this.memory.factory.specialTraget = target
        // 让工厂从暂停中恢复
        delete this.memory.factory.pause
        // 清理残留任务
        if (clear) this.myFactory.clearTask()
        return `[${this.name} factory] 目标已锁定为 ${target}，将会持续生成，${clear ? '遗留任务已被清空' : '遗留任务未清空，可能会堵塞队列'}`
    }

    /**
     * 用户操作 - 清除上面设置的特定目标
     * 如果之前设置过工厂状态的话（setlevel），将会恢复到对应的自动生产状态
     */
    public fclear(): string {
        if (!this.memory.factory) return `[${this.name} factory] 未启用`
        const logs = [ `[${this.name} factory] 已移除目标 ${this.memory.factory.specialTraget}，开始托管生产。当前生产状态：` ]
        delete this.memory.factory.specialTraget
        logs.push(this.myFactory.stats())

        return logs.join('\n')
    }

    public fhelp(): string {
        return createHelp({
            name: 'Factory 控制台',
            describe: `工厂分为自动运行模式和手动运行模式，自动运行模式下会根据设置的目标 ${yellow('.setlevel')}() 和生产线 ${yellow('.setchain')}() 自行安排生产任务，手动运行模式下将一直生产指定 ${yellow('.set')}() 的目标。`,
            api: [
                {
                    title: '设置工厂等级',
                    describe: '初始化方法，新工厂设置自动化请首先执行该方法，一旦工厂被 power 后将无法修改',
                    params: [
                        { name: 'depositType', desc: '生产线类型，必须为 RESOURCE_MIST RESOURCE_BIOMASS RESOURCE_METAL RESOURCE_SILICON 之一' },
                        { name: 'level', desc: '该工厂的生产等级， 1~5 之一'}
                    ],
                    functionName: 'fsetlevel'
                },
                {
                    title: '设置生产线',
                    describe: '初始化方法，需要先执行 .setlevel，会覆盖之前的设置',
                    params: [
                        { name: '...depositTypes', desc: '生产线类型，必须为下列常量 RESOURCE_MIST RESOURCE_BIOMASS RESOURCE_METAL RESOURCE_SILICON，可以指定多个' },
                    ],
                    functionName: 'fsetchain'
                },
                {
                    title: '显示工厂详情',
                    functionName: 'fs'
                },
                {
                    title: '指定生产目标',
                    describe: '工厂将无视 setLevel 的配置，一直生产该目标',
                    params: [
                        { name: 'target', desc: '要生产的目标产物'},
                        { name: 'clear', desc: '[可选] 是否清理工厂之前的遗留任务，默认为 true'}
                    ],
                    functionName: 'fset'
                },
                {
                    title: '移除生产目标',
                    describe: '工厂将恢复自动规划',
                    functionName: 'fclear'
                },
                {
                    title: '暂停工厂',
                    functionName: 'foff'
                },
                {
                    title: '重启工厂',
                    describe: '会将工厂从休眠中唤醒',
                    functionName: 'fon'
                },
                {
                    title: '移除工厂配置',
                    describe: '将会把工厂还原为初始状态（移出所有物品并卸载相关内存）',
                    functionName: 'fremove'
                }
            ]
        })
    }
}