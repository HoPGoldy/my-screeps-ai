
import { FactoryState } from './constants'
import { FactoryMemory, FactoryTask } from './types'

export const createMemoryAccessor = (getMemory: () => FactoryMemory) => ({
    /**
     * 获取当前合成任务
     */
    queryCurrentTask (): FactoryTask | undefined {
        const memory = getMemory()
        if (!memory.taskList) return undefined
        return memory.taskList[0]
    },
    /**
     * 移除当前任务
     * 任务完成或者出错时调用
     */
    deleteCurrentTask (): void {
        const memory = getMemory()
        if (!memory.taskList) return
        memory.taskList.shift()
    },
    /**
     * 挂起合成任务
     * 在任务无法进行时调用，将会把任务移动至队列末尾
     */
    hangTask (): void {
        const memory = getMemory()
        if (!memory.taskList) return
        memory.taskList.push(memory.taskList.shift())
    },
    /**
     * 危险 - 清空当前任务队列
     */
    clearTask (): void {
        const memory = getMemory()
        delete memory.taskList
    },
    /**
     * 设置工厂工作状态
     */
    updateState (newState: FactoryState): void {
        const memory = getMemory()
        memory.state = newState
    }
})

export type FactoryMemoryAccessor = ReturnType<typeof createMemoryAccessor>
