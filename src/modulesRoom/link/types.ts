import { EnvContext } from '@/utils'

export interface LinkMemory {
    /**
     * 中央 link 的 id
     */
    centerLinkId?: Id<StructureLink>
    /**
     * 升级 link 的 id
     */
    upgradeLinkId?: Id<StructureLink>
}

export type LinkContext = {
    getMemory: (room: Room) => LinkMemory
    getLink: (room: Room) => StructureLink[]
    transferEnergy: (from: AnyStoreStructure, to: AnyStoreStructure, amount: number) => unknown
    hasTransferTask: (room: Room) => boolean
    getEnergyStructure: (room: Room) => AnyStoreStructure | undefined
    getSourceLink: (source: Source) => StructureLink | undefined
    onLinkBindToSource?: (link: StructureLink, source: Source) => unknown
} & EnvContext
