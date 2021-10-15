import { MobilizeState, SquadType, WarMemory } from "../types";

export const createMemoryAccessor = (getMemory: () => WarMemory) => ({
    querySpawnRoom() {
        const memory = getMemory()
        return memory.spawnRoomName
    },
    queryMobilizeTasks() {
        const memory = getMemory()
        return memory.mobilizes
    },
    updateMobilizeState(mobilizeCode: string, newState: MobilizeState) {
        const memory = getMemory()
        if (!(mobilizeCode in memory.mobilizes)) return false
        memory.mobilizes[mobilizeCode].state = newState
    },
    querySquads() {
        const memory = getMemory()
        return memory.squads
    },
    insertSquad(squadType: SquadType, squadCode: string): void {
        const memory = getMemory()
        memory.squads[squadCode] = {
            code: squadCode,
            type: squadType,
            memberNames: []
        }
    },
    insertMobilizeTask(squadType: SquadType, needBoost: boolean, squadCode: string): void {
        const memory = getMemory()
        memory.mobilizes[squadCode] = {
            state: MobilizeState.WaitBoostPrepare,
            squadCode,
            squadType,
            needBoost
        }
    }
})
