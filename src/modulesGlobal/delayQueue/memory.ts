import { DelayTask, DelayQueueMemory } from './types'

const TASK_SPLIT_CODE = '▮'

export const createMemoryAccessor = (getMemory: () => DelayQueueMemory) => ({
    queryTaskByTick (tick: number): DelayTask[] {
        const memory = getMemory()
        const tickTaskStr = memory[tick]
        if (!tickTaskStr) return []

        const taskStrs = tickTaskStr.split(TASK_SPLIT_CODE)
        return taskStrs.map(str => JSON.parse(str))
    },
    deleteTaskByTick (tick: number) {
        const memory = getMemory()
        delete memory[tick]
    },
    insertTaskWithTick (tick: number, type: string, data: Record<string, any>) {
        const memory = getMemory()
        const newTaskStr = JSON.stringify({ type, data })

        if (!(tick in memory)) memory[tick] = newTaskStr
        else memory[tick] = memory[tick] + TASK_SPLIT_CODE + newTaskStr
    }
})
