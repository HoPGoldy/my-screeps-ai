import { createSourceUtils, SourceMemory } from '@/modulesGlobal/source'

declare global {
    interface RoomMemory {
        /**
         * source 相关
         */
        source: {
            [sourceId: string]: SourceMemory
        }
    }
}

export const sourceUtils = createSourceUtils({
    getMemory: source => {
        const roomMemory = source.room.memory
        if (!roomMemory.source) roomMemory.source = {}
        if (!roomMemory.source[source.id]) roomMemory.source[source.id] = {}

        return roomMemory.source[source.id]
    }
})
