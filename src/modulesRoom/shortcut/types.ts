export type StructureShortcutKey = STRUCTURE_OBSERVER |
    STRUCTURE_POWER_SPAWN |
    STRUCTURE_EXTRACTOR |
    STRUCTURE_NUKER |
    STRUCTURE_FACTORY |
    STRUCTURE_STORAGE |
    STRUCTURE_TERMINAL |
    STRUCTURE_CONTROLLER |
    STRUCTURE_SPAWN |
    STRUCTURE_EXTENSION |
    STRUCTURE_ROAD |
    STRUCTURE_WALL |
    STRUCTURE_RAMPART |
    STRUCTURE_KEEPER_LAIR |
    STRUCTURE_LINK |
    STRUCTURE_TOWER |
    STRUCTURE_LAB |
    STRUCTURE_CONTAINER

export const SOURCE_KEY = 'source'
export const MINERAL_KEY = 'mineral'

export type RoomShortcutKey = StructureShortcutKey | typeof SOURCE_KEY | typeof MINERAL_KEY

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
        [T in RoomShortcutKey]?: Id<RoomObject>[]
    }
}
