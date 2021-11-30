import { ConstructionMemory } from './types'

export const createMemoryAccessor = (getMemory: () => ConstructionMemory) => ({
    queryWaitingSites: () => {
        const memory = getMemory()
        return memory.waiting || []
    },
    insertWaitingSites: (newList: ConstructionMemory['waiting']) => {
        const memory = getMemory()
        memory.waiting = [...(memory.waiting || []), ...newList]
        if (memory.waiting.length <= 0) delete memory.waiting
    },
    queryBuildSites: () => {
        const memory = getMemory()
        return memory.building || {}
    },
    updateBuildingSites: (newList: ConstructionMemory['building']) => {
        const memory = getMemory()
        if (Object.keys(newList).length <= 0) delete memory.building
        else memory.building = newList
    }
})
