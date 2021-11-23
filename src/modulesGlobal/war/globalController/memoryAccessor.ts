import { SquadType } from '../squadManager/types'
import { WarMemory, WarModuleMemory } from '../types'

export const createMemoryAccessor = (getMemory: () => WarModuleMemory) => ({
    queryWarCodes () {
        const memory = getMemory()
        return Object.keys(memory.wars)
    },
    queryWarMemory (warCode: string): WarMemory | undefined {
        const memory = getMemory()
        return memory.wars[warCode]
    },
    insertWarMemory (newWarMemory: WarMemory): void {
        const memory = getMemory()
        memory.wars[newWarMemory.code] = newWarMemory
    },
    updateDefaultSquad (squadType: SquadType, needBoost: boolean, squadCode?: string) {
        const memory = getMemory()
        memory.default = [squadType, needBoost, squadCode || '']
    },
    queryDefaultSquad (): [SquadType, boolean, string] | undefined {
        const memory = getMemory()
        return memory.default
    },
    deleteWar (warCode: string) {
        const memory = getMemory()
        delete memory.wars[warCode]
    },
    deleteDefaultSquad (): void {
        const memory = getMemory()
        delete memory.default
    }
})
