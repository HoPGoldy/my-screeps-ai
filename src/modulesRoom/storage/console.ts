import { yellow, createHelp } from '@/utils'
import { BalanceDirection } from './types'

/**
 * Storage 的用户访问接口
 */
export default class StorageConsole extends Room {
    /**
     * 在 storage 和 terminal 之间进行资源平衡
     * 以及 sb 是 storage balance 的缩写
     */
    sb (): string {
        const result = this.myStorage.balanceResource()
        if (result === ERR_NOT_FOUND) return 'storage 或 termianl 不存在'
        const pad = content => _.padRight((content || '').toString(), 15)

        const logs = [pad('RESOURCE') + pad('STORAGE') + pad('TASK') + pad('TERMINAL')]

        result.forEach(({ resourceType, amount, direction }) => {
            const task = direction === BalanceDirection.ToStorage
                ? pad('<= ' + amount)
                : pad(amount + ' =>')

            const log = yellow(pad(resourceType)) +
                pad(this.storage.store[resourceType]) +
                task +
                pad(this.terminal.store[resourceType])

            logs.push(log)
        })

        return logs.join('\n')
    }

    /**
     * 手动请求能量
     */
    getenergy (): void {
        this.myStorage.requestEnergyCheck()
    }

    public shelp (): string {
        return createHelp({
            name: 'Storage 控制台',
            describe: '在多房间之间共享能量，维持 terminal 中的资源储量',
            api: [
                {
                    title: '执行资源平衡',
                    describe: '在 terminal 和 sotrage 中调度资源，防止终端被塞满',
                    functionName: 'sb'
                },
                {
                    title: '发起能量请求检查',
                    describe: '如果能量不足的话可以调用这个命令手动请求其他房间进行共享（会在能量不足时定期自动执行）',
                    functionName: 'getenergy'
                }
            ]
        })
    }
}
