import { yellow, createHelp } from '@/modulesGlobal/console'
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
        const MAX_LENGTH = 15

        const logs = [_.padRight('RESOURCE', MAX_LENGTH) +
        _.padRight('STORAGE', MAX_LENGTH) +
        _.padRight('TASK', MAX_LENGTH) +
        _.padRight('TERMINAL', MAX_LENGTH)]

        result.forEach(({ resourceType, amount, direction }) => {
            const task = direction === BalanceDirection.ToStorage
                ? _.padRight('<= ' + amount.toString(), MAX_LENGTH - 2)
                : _.padRight(amount.toString() + ' =>', MAX_LENGTH - 2)

            const log = _.padRight(yellow(resourceType), MAX_LENGTH) +
                _.padRight(this.storage.store[resourceType].toString(), MAX_LENGTH) +
                task +
                _.padRight(this.terminal.store[resourceType].toString(), MAX_LENGTH)

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
