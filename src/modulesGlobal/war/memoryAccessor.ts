import { SquadType, WarMemory, WarModuleMemory } from "./types"

export const createMemoryAccessor = function (getMemory: () => WarModuleMemory) {
    const queryWarCodes = function () {
        const memory = getMemory()
        return Object.keys(memory.wars)
    }

    const queryWarMemory = function (warCode: string): WarMemory | undefined {
        const memory = getMemory()
        return memory.wars[warCode]
    }

    const insertWarMemory = function (newWarMemory: WarMemory): void {
        const memory = getMemory()
        memory.wars[newWarMemory.code] = newWarMemory
    }

    const updateDefaultSquad = function (squadType: SquadType, needBoost: boolean, squadCode: string) {
        const memory = getMemory()
        memory.default = [squadType, needBoost, squadCode]
    }

    const queryDefaultSquad = function (): [SquadType, boolean, string] | undefined {
        const memory = getMemory()
        return memory.default
    }

    return { queryWarCodes, queryWarMemory, insertWarMemory, queryDefaultSquad, updateDefaultSquad }
}
