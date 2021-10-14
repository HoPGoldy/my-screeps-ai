import { MobilizeState, WarMemory } from "../types";

export const createMemoryAccessor = function (getMemory: () => WarMemory) {
    const querySpawnRoom = function () {
        const memory = getMemory()
        return memory.spawnRoomName
    }

    const queryMobilizeTasks = function () {
        const memory = getMemory()
        return memory.mobilizes
    }

    const updateMobilizeState = function (mobilizeCode: string, newState: MobilizeState) {
        const memory = getMemory()
        if (!(mobilizeCode in memory.mobilizes)) return false
        memory.mobilizes[mobilizeCode].state = newState
    }

    const querySquads = function () {
        const memory = getMemory()
        return memory.squads
    }

    return { querySpawnRoom, queryMobilizeTasks, updateMobilizeState, querySquads }
}