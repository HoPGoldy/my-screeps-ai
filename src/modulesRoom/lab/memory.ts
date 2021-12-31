import { BoostResourceConfig, getUniqueKey } from '@/utils'
import { LAB_TARGETS } from './constants'
import { BoostState, BoostTask, LabMemory, LabTarget } from './types'

export const createMemoryAccessor = (getMemory: () => LabMemory) => ({
    pauseLab () {
        const memory = getMemory()
        memory.pause = true
    },
    resumeLab () {
        const memory = getMemory()
        delete memory.pause
    },
    /**
     * 查询当前索引指向的目标
     */
    queryCurrentTarget (): LabTarget {
        const memory = getMemory()
        // 如果 targetIndex 没有找到对应资源的话，就更新索引再试一次
        // 一般都是因为修改了 LAB_TARGETS 导致的
        if (!memory.reactionIndex || memory.reactionIndex >= LAB_TARGETS.length) {
            memory.reactionIndex = 0
        }
        return LAB_TARGETS[memory.reactionIndex]
    },
    /**
     * 使用强化任务 id 查询任务
     */
    queryBoostTaskById (taskId: number) {
        const memory = getMemory()
        return memory.boostTasks.find(task => task.id === taskId)
    },
    /**
     * 查询指定 creep 的 boost 清单
     * **若不存在将会新建**
     */
    queryCreepBoostingNote (creepName: string, boostTask: BoostTask) {
        const memory = getMemory()
        // 之前没来强化过，新建个档案
        if (!(creepName in memory.boostingNote)) {
            memory.boostingNote[creepName] = boostTask.res.map(res => ({
                labId: res.lab,
                boosted: false
            }))
        }

        return memory.boostingNote[creepName]
    },
    /**
     * 移除指定 creep 的 boost 清单
     */
    deleteCreepBoostingNote (creepName: string) {
        const memory = getMemory()
        delete memory.boostingNote[creepName]
    },
    /**
     * 更新底物 lab
     */
    updateInLab (labA: StructureLab, labB: StructureLab) {
        const memory = getMemory()
        memory.inLab = [labA.id, labB.id]
    },
    /**
     * 将 lab.targetIndex 设置到下一个目标
     * @returns 当前的目标索引
     */
    updateIndexToNext (): number {
        const memory = getMemory()
        memory.reactionIndex = ((memory.reactionIndex || 0) + 1) % LAB_TARGETS.length
        return memory.reactionIndex
    },
    /**
     * 添加新的 boost 任务
     */
    insertBoostTask (resConfig: BoostResourceConfig[]): BoostTask {
        const memory = getMemory()
        if (!memory.boostTasks) memory.boostTasks = []

        const taskData: BoostTask = {
            id: getUniqueKey(),
            res: _.cloneDeep(resConfig),
            state: BoostState.GetLab
        }

        memory.boostTasks.push(taskData)
        return taskData
    },
    /**
     * 使用 id 删除 boost 任务
     */
    deleteBoostTask (taskId: number) {
        const memory = getMemory()
        const removeIndex = (memory.boostTasks || []).findIndex(task => task.id === taskId)
        memory.boostTasks.splice(removeIndex, 1)
        if (memory.boostTasks.length <= 0) delete memory.boostTasks
    },
    /**
     * 查询指定 id 的 boost 任务状态
     */
    queryBoostState (taskId: number): ERR_NOT_FOUND | BoostState {
        const memory = getMemory()
        const task = (memory.boostTasks || []).find(task => task.id === taskId)
        if (!task) return ERR_NOT_FOUND
        return task.state
    }
})

export type LabMemoryAccessor = ReturnType<typeof createMemoryAccessor>
