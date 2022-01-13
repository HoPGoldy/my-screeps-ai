import { DelayTask, DelayQueueMemory } from './types'

const TASK_SPLIT_CODE = '▮'

export const createMemoryAccessor = (getMemory: () => DelayQueueMemory) => ({
    queryTaskByTick (tick: number): DelayTask[] {
        const memory = getMemory()
        const taskStrs: string[] = []

        const allKeys = Object.keys(memory)
        /**
         * 这里做了个保险
         * 正常情况下只需要读取对应 tick 的任务即可
         * 但是考虑到如果服务器出现问题后可能会导致某些 tick 无法正常运行
         * 所以这里实际上是“取出本 tick 及之前的任务进行处理”
         *
         * 由于这里的键都是递增的数字，所以可以认为 Object.keys 返回的键数组是有序的
         */
        for (const savedTick of allKeys) {
            if (Number(savedTick) > tick) break
            taskStrs.push(...memory[savedTick].split(TASK_SPLIT_CODE))
        }

        if (taskStrs.length <= 0) return []

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
