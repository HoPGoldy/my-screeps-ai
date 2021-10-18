import { BaseEffects, RoomInfo, SquadType, WarManager, WarMemory } from "../types"
import { runMobilizeTask } from "../mobilizeManager/mobilizeManager"
import { createMemoryAccessor } from "./memoryAccessor"

type CreateEffects = {
    getWarMemory: () => WarMemory
    getCostMatrix: (roomName: string) => CostMatrix
    getRoomInfo: (roomName: string) => RoomInfo
} & BaseEffects

export const createWarManager = function (effects: CreateEffects): WarManager {
    const db = createMemoryAccessor(effects.getWarMemory)

    const addSquad = function () {

    }

    const removeSquad = function () {
        
    }

    const run = function () {
        const mobilizes = db.queryMobilizeTasks()
        const squads = db.querySquads()
        const spawnRoom = db.querySpawnRoom()

        // 运行所有动员任务
        Object.values(mobilizes).forEach(task => {
            runMobilizeTask(
                task,
                effects.getRoomByName(spawnRoom),
                newState => db.updateMobilizeState(task.squadCode, newState)
            )
        })

        Object.values(squads).forEach(squadMemory => {
            
        })
    }

    return { run, addSquad, removeSquad, addMobilize: db.insertMobilizeTask }
}
