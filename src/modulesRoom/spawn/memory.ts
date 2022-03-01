import { serializeBody } from '@/utils'
import { SpawnContext, SpawnMemory, SpawnTask } from './types'

export const createMemoryAccessor = function (context: SpawnContext, getMemory: () => SpawnMemory) {
    /**
     * 向生产队列里推送一个生产任务
     *
     * @param name 要孵化的 creep 名字
     * @param role 该 creep 的角色
     * @param bodys 该 creep 的身体数组
     * @param data 该 creep 的自定义数据
     * @returns 当前任务在队列中的排名
     */
    const addTask = function (name: string, role: string, bodys: BodyPartConstant[], data?: Record<string, any>): number | ERR_NAME_EXISTS | ERR_NO_BODYPART {
        if (bodys.length <= 0) {
            context.env.log.warning(`新孵化任务 ${name} 的身体部件为空，已移除任务`)
            return ERR_NO_BODYPART
        }
        const memory = getMemory()

        // 先检查下任务是不是已经在队列里了
        // 如果已经有的话返回异常
        if (hasTask(name)) return ERR_NAME_EXISTS

        // 任务加入队列
        if (!memory.spawnList) memory.spawnList = []
        memory.spawnList.push({ name, role, data, bodys: serializeBody(bodys) })
        return memory.spawnList.length - 1
    }

    /**
     * 检查生产队列中是否包含指定任务
     *
     * @param creepName 要检查的 creep 名称
     * @returns 有则返回 true
     */
    const hasTask = function (creepName: string): boolean {
        const memory = getMemory()
        if (!memory.spawnList) return false
        return !!memory.spawnList.find(({ name }) => name === creepName)
    }

    /**
     * 使用角色名获取孵化任务
     */
    const queryTaskByRole = function (creepRole: string): SpawnTask[] {
        const memory = getMemory()
        if (!memory.spawnList) return []
        return memory.spawnList.filter(({ role }) => role === creepRole)
    }

    /**
     * 清空任务队列
     * @danger 非测试情况下不要调用！
     */
    const deleteAllTask = function (): void {
        const memory = getMemory()
        delete memory.spawnList
    }

    /**
     * 将当前孵化任务挂起
     * 任务会被移动至队列末尾
     */
    const hangTask = function (): void {
        const memory = getMemory()
        if (!memory.spawnList) return
        memory.spawnList.push(memory.spawnList.shift())
    }

    /**
     * 获取当前第一个孵化任务
     */
    const queryCurrentTask = function () {
        const memory = getMemory()
        if (!memory.spawnList) return
        return memory.spawnList[0]
    }

    /**
     * 移除第一个孵化任务
     */
    const deleteCurrentTask = function (): void {
        const memory = getMemory()
        // 从孵化任务队列中移除
        if (memory.spawnList.length > 1) memory.spawnList.shift()
        else delete memory.spawnList
    }

    /**
     * 把一个爬加入孵化中名单
     */
    const updateSpawning = function (creepName: string) {
        const memory = getMemory()

        if (!memory.spawning) memory.spawning = {}
        memory.spawning[creepName] = true
    }

    /**
     * 把一个爬移除出孵化中名单
     */
    const deleteSpawning = function (creepName: string) {
        const memory = getMemory()

        if (!memory.spawning) return
        delete memory.spawning[creepName]
        if (Object.keys(memory.spawning)) delete memory.spawning
    }

    return {
        addTask, hasTask, queryTaskByRole, deleteAllTask, hangTask, queryCurrentTask,
        deleteCurrentTask, updateSpawning, deleteSpawning
    }
}

export type SpawnMemoryAccessor = ReturnType<typeof createMemoryAccessor>
