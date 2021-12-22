import { MINERAL_KEY, RoomShortcutKey, SOURCE_KEY, StructureIdCache, StructureShortcutKey } from './types'

const allRoomShortcutKey: RoomShortcutKey[] = [
    STRUCTURE_OBSERVER, STRUCTURE_POWER_SPAWN, STRUCTURE_EXTRACTOR, STRUCTURE_NUKER, STRUCTURE_FACTORY, STRUCTURE_STORAGE,
    STRUCTURE_TERMINAL, STRUCTURE_CONTROLLER, STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_WALL,
    STRUCTURE_RAMPART, STRUCTURE_KEEPER_LAIR, STRUCTURE_LINK, STRUCTURE_TOWER, STRUCTURE_LAB, STRUCTURE_CONTAINER,
    SOURCE_KEY, MINERAL_KEY
]

export const createRoomShortcut = function () {
    /**
     * 建筑 Id 缓存
     * 在首次访问后会运行 Room.find 获取建筑并将其 id 缓存在这里
     */
    const structureIdCache: StructureIdCache = {}

    /**
     * 获取指定键的私有键名
     */
    const getPrivateKey = key => `_room_shortcut_${key}`

    /**
     * 获取缓存中的建筑 ID
     *
     * @param roomName 要查询的房间名
     * @param type 要查询的建筑类型
     */
    const getCacheId = function (roomName: string, type: RoomShortcutKey): Id<RoomObject>[] {
        if (!structureIdCache[roomName]) return undefined
        if (!structureIdCache[roomName][type]) return []

        return structureIdCache[roomName][type]
    }

    /**
     * 设置建筑 ID 缓存
     * 本方法会 **直接替换** 目标位置的旧缓存
     *
     * @param roomName 要设置到的房间
     * @param type 要设置到的建筑类型
     * @param ids 要设置的 id
     */
    const setCacheId = function (roomName: string, type: RoomShortcutKey, ids: Id<RoomObject>[]) {
        if (!structureIdCache[roomName]) structureIdCache[roomName] = {}
        if (!structureIdCache[roomName][type]) structureIdCache[roomName][type] = []

        structureIdCache[roomName][type] = ids
        return ids
    }

    /**
     * 追加新的建筑缓存
     *
     * **新建筑造好后需要调用该方法**，
     * 该方法会将提供的缓存 id 追加到指定位置的缓存末尾
     *
     * @param room 房间
     * @param type 要追加到的建筑类型
     * @param id 新的建筑 id
     */
    const updateStructure = function <T extends BuildableStructureConstant> (room: Room, type: T, id: Id<RoomObject>) {
        if (!structureIdCache[room.name]) structureIdCache[room.name] = {}
        if (!structureIdCache[room.name][type]) structureIdCache[room.name][type] = []
        structureIdCache[room.name][type].push(id)

        // 移除房间上的建筑对象缓存
        delete room[getPrivateKey(type)]
    }

    /**
     * 初始化指定房间的建筑缓存
     *
     * @param room 要初始化的房间
     */
    const initShortcutCache = function (room: Room): void {
        structureIdCache[room.name] = {}

        // 查找建筑
        const structureGroup = _.groupBy(room.find(FIND_STRUCTURES), s => s.structureType)
        // 查找静态资源
        Object.assign(structureGroup, {
            mineral: room.find(FIND_MINERALS),
            [SOURCE_KEY]: room.find(FIND_SOURCES)
        })

        // 把需要的建筑 id 存入全局缓存，并直接初始化 room 缓存
        for (const type of allRoomShortcutKey) {
            // 如果房间内某种建筑还没有的话就填充为空数组
            structureIdCache[room.name][type] = (structureGroup[type] || []).map(s => s.id)
            room[getPrivateKey(type)] = structureGroup[type] || []
        }
    }

    /**
     * [核心实现] 获取指定房间的建筑缓存
     *
     * @param room 目标房间
     * @param type 要获取的建筑类型
     *
     * @returns 对应的建筑**数组**
     */
    const getStructureWithCache = function <TargetStructure extends RoomObject> (
        room: Room, type: RoomShortcutKey
    ): TargetStructure[] {
        const privateKey = getPrivateKey(type)

        // 本 tick 有缓存就直接返回
        if (room[privateKey]) return room[privateKey]

        let ids = getCacheId(room.name, type)
        // 缓存中没有 id 说明还没进行初始化
        if (!ids) {
            initShortcutCache(room)
            ids = getCacheId(room.name, type)
        }
        // 还没有的话就是真没有，直接返回空
        if (!ids || ids.length === 0) return []

        // 从 id 获取建筑并剔除掉已经不存在的建筑缓存
        const target: TargetStructure[] = []
        const avaliableId = ids.filter(id => {
            const structure = Game.getObjectById(id)
            if (!structure) return false

            target.push(structure as TargetStructure)
            return true
        })

        setCacheId(room.name, type, avaliableId)

        // 暂存对象并返回
        room[privateKey] = target
        return target
    }

    /**
     * 创建建筑访问器
     *
     * @param type 建筑类型
     * @param isSingle 是否返回单个建筑
     */
    function createGetter (type: typeof SOURCE_KEY, isSingle: false): (room: Room) => Source[]
    function createGetter (type: typeof MINERAL_KEY): (room: Room) => Mineral
    function createGetter <T extends StructureShortcutKey>(type: T, isSingle?: true): (room: Room) => ConcreteStructure<T>
    function createGetter <T extends StructureShortcutKey>(type: T, isSingle?: false): (room: Room) => ConcreteStructure<T>[]
    function createGetter (type: RoomShortcutKey, isSingle = true) {
        return (room: Room) => {
            if (!room) return undefined
            const structures = getStructureWithCache(room, type)
            return isSingle ? structures[0] : structures
        }
    }

    /**
     * 获取房间上的建筑
     * **注意！structureType 并不支持所有的建筑类型**，StructureShortcutKey 中包含了所有支持的建筑类型
     *
     * @param room 要获取的房间
     * @param structureType 要获取的建筑类型
     * @returns **返回类型必定为数组**
     */
    const getStructure = function <T extends StructureShortcutKey> (room: Room, structureType: T): ConcreteStructure<T>[] {
        if (!room) return undefined
        return getStructureWithCache(room, structureType)
    }

    return {
        getSpawn: createGetter(STRUCTURE_SPAWN, false),
        getExtension: createGetter(STRUCTURE_EXTENSION, false),
        getRoad: createGetter(STRUCTURE_ROAD, false),
        getWall: createGetter(STRUCTURE_WALL, false),
        getRampart: createGetter(STRUCTURE_RAMPART, false),
        getKeeperLair: createGetter(STRUCTURE_KEEPER_LAIR, false),
        getLink: createGetter(STRUCTURE_LINK, false),
        getTower: createGetter(STRUCTURE_TOWER, false),
        getLab: createGetter(STRUCTURE_LAB, false),
        getContainer: createGetter(STRUCTURE_CONTAINER, false),
        getFactory: createGetter(STRUCTURE_FACTORY),
        getPowerSpawn: createGetter(STRUCTURE_POWER_SPAWN),
        getNuker: createGetter(STRUCTURE_NUKER),
        getObserver: createGetter(STRUCTURE_OBSERVER),
        getExtractor: createGetter(STRUCTURE_EXTRACTOR),
        getMineral: createGetter(MINERAL_KEY),
        getSource: createGetter(SOURCE_KEY, false),

        getStructure,
        updateStructure
    }
}
