import { crossMerge } from '@/utils'
import { BALANCE_CONFIG, DEFAULT_BALANCE_LIMIT } from '../constant'
import { BalanceDirection, BalanceResult, StorageContext } from '../types'

export const useBalanceTerminal = function (roomName: string, context: StorageContext) {
    const { env, addTransportTask } = context

    /**
     * 在 terminal 和 storage 之间平衡资源
     */
    const balanceResource = function (targetResource?: ResourceConstant): BalanceResult[] | ERR_NOT_FOUND {
        const room = env.getRoomByName(roomName)
        if (!room || !room.storage || !room.terminal) return ERR_NOT_FOUND

        // 要传递到 terminal 的任务和要传递到 storage 的任务分开放
        const toStorageTasks: BalanceResult<BalanceDirection.ToStorage>[] = []
        const toTerminalTasks: BalanceResult<BalanceDirection.ToTerminal>[] = []

        // 指定了目标，只调度这一种资源
        if (targetResource) {
            checkAndGenerateTask(
                room,
                targetResource,
                room.terminal.store[targetResource],
                toStorageTasks,
                toTerminalTasks
            )
        }
        // 没有指定目标，调度所有存在的资源
        else {
            const balanceTask = _.cloneDeep(BALANCE_CONFIG)

            // 检查终端资源是否需要平衡
            Object.entries(room.terminal.store).forEach((
                [resourceType, terminalAmount]: [ResourceConstant, number]
            ) => {
                checkAndGenerateTask(room, resourceType, terminalAmount, toStorageTasks, toTerminalTasks)
                // 这条资源已经检查过了，移除
                delete balanceTask[resourceType]
            })

            // 检查终端里没有，但是规则里提到的资源
            // 上面只会检查终端里还有的资源，如果数量为空就不会检查了，这里会把这些资源检查补上
            Object.entries(balanceTask).forEach((
                [resourceType, amountLimit]: [ResourceConstant, number]
            ) => {
                const storageAmount = room.storage.store[resourceType] || 0
                if (storageAmount <= 0) return

                toTerminalTasks.push({
                    resourceType,
                    amount: Math.min(amountLimit, storageAmount),
                    direction: BalanceDirection.ToTerminal
                })
            })
        }

        // 将两个任务数组交叉合并在一起，并发布任务
        const mergedTasks = mergeTasks(room, toStorageTasks, toTerminalTasks)
        const requests = generateTransportTask(room, mergedTasks)
        addTransportTask(room, requests)

        return mergedTasks
    }

    /**
     * 合并任务数组
     * @param toStorageTasks 要把资源运到 storage 的任务数组
     * @param toTerminalTasks 要把资源运到终端的任务数组
     */
    const mergeTasks = function (
        selfRoom: Room,
        toStorageTasks: BalanceResult<BalanceDirection.ToStorage>[],
        toTerminalTasks: BalanceResult<BalanceDirection.ToTerminal>[]
    ) {
        // 把两组任务按照任务搬运量升序排序
        const sortedToStorageTasks = _.sortBy(toStorageTasks, ({ amount }) => amount)
        const sortedToTerminalTasks = _.sortBy(toTerminalTasks, ({ amount }) => amount)

        // storage 和 terminal 哪个剩的地方大就先往哪挪，两个方向的任务交叉执行
        return selfRoom.storage.store.getFreeCapacity() > selfRoom.terminal.store.getFreeCapacity()
            ? crossMerge<BalanceResult>(sortedToStorageTasks, sortedToTerminalTasks)
            : crossMerge<BalanceResult>(sortedToTerminalTasks, sortedToStorageTasks)
    }

    /**
     * 按照平衡策略生成对应的中央物流任务
     */
    const generateTransportTask = function (selfRoom: Room, tasks: BalanceResult[]) {
        const sotrageId = selfRoom.storage.id
        const terminalId = selfRoom.terminal.id

        return tasks.map((task, index) => {
            const { to, from } = task.direction === BalanceDirection.ToStorage
                ? { to: sotrageId, from: terminalId }
                : { to: terminalId, from: sotrageId }
            return { to, from, resType: task.resourceType, amount: task.amount }
        })
    }

    /**
     * 检查一种 terminal 里有的资源是否需要平衡
     * 如果需要的话会把任务存放到第三个和第四个参数对应的数组里
     *
     * @param resourceType 要检查的资源
     * @param terminalAmount 该资源在 terminal 里的数量
     * @param toStorageTasks 要把资源运到 storage 的任务数组
     * @param toTerminalTasks 要把资源运到终端的任务数组
     */
    const checkAndGenerateTask = function (
        selfRoom: Room,
        resourceType: ResourceConstant,
        terminalAmount: number,
        toStorageTasks: BalanceResult<BalanceDirection.ToStorage>[],
        toTerminalTasks: BalanceResult<BalanceDirection.ToTerminal>[]
    ): void {
        const configAmount = BALANCE_CONFIG[resourceType] || DEFAULT_BALANCE_LIMIT

        // 需要从 terminal 运到 storage
        if (terminalAmount > configAmount) {
            toStorageTasks.push({
                resourceType,
                amount: terminalAmount - configAmount,
                direction: BalanceDirection.ToStorage
            })
        }
        // 需要从 storage 运到 terminal
        else if (terminalAmount < configAmount) {
            const amount = Math.min(configAmount - terminalAmount, selfRoom.storage.store[resourceType])
            // sotrage 里没有所需的资源，无法平衡
            if (amount <= 0) return

            toTerminalTasks.push({
                resourceType,
                amount,
                direction: BalanceDirection.ToTerminal
            })
        }
    }

    /**
     * 手动调用资源平衡
     * 会包含一些额外的控制台输出
     */
    const runBalanceResource = function (): string {
        const room = env.getRoomByName(roomName)

        const result = balanceResource()
        if (result === ERR_NOT_FOUND) return 'storage 或 termianl 不存在'
        const pad = content => _.padRight((content || '').toString(), 15)

        const logs = [pad('RESOURCE') + pad('STORAGE') + pad('TASK') + pad('TERMINAL')]

        result.forEach(({ resourceType, amount, direction }) => {
            const task = direction === BalanceDirection.ToStorage
                ? pad('<= ' + amount)
                : pad(amount + ' =>')

            const log = env.colorful.yellow(pad(resourceType)) +
                pad(room.storage.store[resourceType]) +
                task +
                pad(room.terminal.store[resourceType])

            logs.push(log)
        })

        return logs.join('\n')
    }

    return { balanceResource, runBalanceResource }
}
