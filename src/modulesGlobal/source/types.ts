export type SourceContext = {
    getMemory: (source: Source) => SourceMemory
}

export interface SourceMemory {
    /**
     * 能量丢弃到的位置
     * x 在前，y 在后，形如 23,32
     */
    dropped?: string
    /**
     * 该 source 配套的 container id
     */
    containerId?: Id<StructureContainer>
    /**
     * 该 source 配套的 link id
     */
    linkId?: Id<StructureLink>
}
