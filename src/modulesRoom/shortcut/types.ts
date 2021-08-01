declare global {
    interface Room {
        /**
         * 建筑快捷访问
         */
        [STRUCTURE_FACTORY]?: StructureFactory
        [STRUCTURE_POWER_SPAWN]?: StructurePowerSpawn
        [STRUCTURE_NUKER]?: StructureNuker
        [STRUCTURE_OBSERVER]?: StructureObserver
        [STRUCTURE_EXTRACTOR]?: StructureExtractor
    
        [STRUCTURE_SPAWN]?: StructureSpawn[]
        [STRUCTURE_EXTENSION]?: StructureExtension[]
        [STRUCTURE_ROAD]?: StructureRoad[]
        [STRUCTURE_WALL]?: StructureWall[]
        [STRUCTURE_RAMPART]?: StructureRampart[]
        [STRUCTURE_KEEPER_LAIR]?: StructureKeeperLair[]
        [STRUCTURE_PORTAL]?: StructurePortal[]
        [STRUCTURE_LINK]?: StructureLink[]
        [STRUCTURE_TOWER]?: StructureTower[]
        [STRUCTURE_LAB]?: StructureLab[]
        [STRUCTURE_CONTAINER]?: StructureContainer[]
    
        mineral?: Mineral
        source?: Source[]
        centerLink?: StructureLink
        upgradeLink?: StructureLink
    }
}

/**
 * 所有被添加到 Room 上的快捷访问键
 */
export type AllRoomShortcut = STRUCTURE_OBSERVER | STRUCTURE_POWER_SPAWN | STRUCTURE_EXTRACTOR | 
    STRUCTURE_NUKER | STRUCTURE_FACTORY | STRUCTURE_SPAWN | STRUCTURE_EXTENSION | STRUCTURE_ROAD | 
    STRUCTURE_WALL | STRUCTURE_RAMPART | STRUCTURE_KEEPER_LAIR | STRUCTURE_PORTAL | STRUCTURE_LINK | 
    STRUCTURE_TOWER | STRUCTURE_LAB | STRUCTURE_CONTAINER | 'mineral' | 'source'

/**
 * 房间快捷访问的 id 缓存
 */
export type StructureIdCache = {
    /**
     * 每个房间的建筑 id 合集
     */
    [roomName: string]: {
        /**
         * 每个建筑类型对应的 id 数组
         * 这里不考虑建筑是单个还是多个，统一都是数组
         */
        [T in AllRoomShortcut]?: Id<RoomObject>[]
    }
}