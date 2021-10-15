import { BaseEffects, SquadType, WarManager, WarMemory } from "../types"
import { runMobilizeTask } from "../mobilizeManager/mobilizeManager"
import { createMemoryAccessor } from "./memoryAccessor"

type CreateEffects = {
    getWarMemory: () => WarMemory
    getCostMatrix: (roomName: string) => CostMatrix
    setCostMatrix: (roomName: string, newCost: CostMatrix) => void
} & BaseEffects

export const createWarManager = function (effects: CreateEffects): WarManager {
    const db = createMemoryAccessor(effects.getWarMemory)

    const addSquad = function () {

    }

    const removeSquad = function () {
        
    }

    const run = function () {
        const mobilizes = db.queryMobilizeTasks()
        const spawnRoom = db.querySpawnRoom()

        // 运行所有动员任务
        Object.values(mobilizes).forEach(task => {
            runMobilizeTask(
                task,
                effects.getRoomByName(spawnRoom),
                newState => db.updateMobilizeState(task.squadCode, newState)
            )
        })
    }

    return { run, addSquad, removeSquad, addMobilize: db.insertMobilizeTask }
}
