import { TerminalChannel, TerminalMode } from './constants'
import { TerminalListenTask, TerminalMemory } from './types'
import { isTaskMatched, stringifyTask, unstringifyTask } from './utils'

export const createMemoryAccessor = (getMemory: () => TerminalMemory) => ({
    /**
     * 添加终端矿物监控
     *
     * @param resourceType 要监控的资源类型
     * @param amount 期望的资源数量
     * @param mod 监听类型
     * @param channel 交易策略
     * @param priceLimit 价格限制
     * @param supportRoomName 要支援的房间名【在 channel 为 support 时生效】
     */
    insertListenTask (
        resourceType: ResourceConstant,
        amount: number,
        mod: TerminalMode = TerminalMode.Get,
        channel: TerminalChannel = TerminalChannel.Take,
        priceLimit: number = undefined
    ): void {
        const memory = getMemory()

        // 先移除同类型的监听任务
        if (memory.tasks.length > 0) {
            _.remove(memory.tasks, taskStr => isTaskMatched(taskStr, resourceType, mod, channel))
        }

        if (!memory.tasks) memory.tasks = []
        memory.tasks.push(stringifyTask({ mod, channel, type: resourceType, amount, priceLimit }))
    },

    /**
     * 移除终端矿物监控
     *
     * @param index 要移除的任务索引
     * @return OK 移除完成
     * @returns ERR_INVALID_ARGS 传入了错误的索引
     * @returns ERR_NOT_FOUND 该房间暂无监听任务
     */
    deleteListenTask (index: number): OK | ERR_INVALID_ARGS | ERR_NOT_FOUND {
        const memory = getMemory()
        if (!memory.tasks) return OK
        if (_.isUndefined(index) || index >= memory.tasks.length) return ERR_INVALID_ARGS

        memory.tasks.splice(index, 1)
        if (memory.tasks.length <= 0) delete memory.tasks

        return OK
    },

    /**
     * 将索引指向下一个要监听的资源
     */
    updateIndexToNext (): void {
        const memory = getMemory()
        const index = memory.index || 0
        const tasksLength = memory.tasks.length
        memory.index = index + 1 % tasksLength
    },

    /**
     * 从内存中索引获取正在监听的资源
     *
     * @returns 该资源的信息，格式如下：
     *   @property {} type 资源类型
     *   @property {} amount 期望数量
     */
    queryCurrentListenTask (): TerminalListenTask | undefined {
        const memory = getMemory()

        if (!memory.tasks || memory.tasks.length === 0) return undefined
        let index = memory.index || 0

        // 做个兜底，防止玩家手动移除任务后指针指向 undefined
        if (index >= memory.tasks.length) {
            memory.index = index = 0
        }

        // 对序列化的任务进行重建
        return unstringifyTask(memory.tasks[index])
    }
})

export type TerminalMemoryAccessor = ReturnType<typeof createMemoryAccessor>
