import { LinkMemory } from './types'

export const createMemoryAccessor = (getMemory: () => LinkMemory, roomName: string) => ({
    isCenterLink (link: StructureLink) {
        const memory = getMemory()
        return link.id === memory.centerLinkId
    }
})

export type LinkMemoryAccessor = ReturnType<typeof createMemoryAccessor>
