import { BaseEffects, WarManager, WarMemory } from "../types"
import { runMobilizeTask } from "../mobilizeManager/mobilizeManager"
import { createMemoryAccessor } from "./memoryAccessor"

type CreateEffects = {
    getWarMemory: () => WarMemory
} & BaseEffects

export const createWarManager = function (opts: CreateEffects): WarManager {
    const { getWarMemory, getRoomByName } = opts
    const { queryMobilizeTasks, querySpawnRoom, querySquads, updateMobilizeState } = createMemoryAccessor(getWarMemory)

    const addSquad = function () {

    }

    const removeSquad = function () {
        
    }

    const run = function () {
        const mobilizes = queryMobilizeTasks()
        const spawnRoom = querySpawnRoom()

        // 运行所有动员任务
        Object.values(mobilizes).forEach(task => {
            runMobilizeTask(
                task,
                getRoomByName(spawnRoom),
                newState => updateMobilizeState(task.squadCode, newState)
            )
        })
    }

    return { run, addSquad, removeSquad }
}
