import { createGetter } from '@/utils'
import { AllRoomShortcut, StructureIdCache } from './types'

/**
 * 挂载房间快捷访问
 *
 * 提供对房间内资源的快捷访问方式，如：W1N1.nuker、W1N1.sources 等
 * 包括唯一型建筑（Nuker、Factory ...）复数型建筑（Spawn、extension）和自然资源（Source、Mineral ...）
 *
 * 所有可用的访问属性见上方 SINGLE_STRUCTURES 和 MULTIPLE_STRUCTURES
 */
const mountShortcut = function() {
    // 添加基础的快捷访问
    SINGLE_STRUCTURES.forEach(setShortcut(true))
    MULTIPLE_STRUCTURES.forEach(setShortcut(false))

    // 挂载特殊快捷方式
    createGetter(Room, 'centerLink', centerLinkGetter)
    createGetter(Room, 'upgradeLink', upgradeLinkGetter)
}

export default mountShortcut

/**
 * 所有在房间中具有唯一性的建筑
 *
 * 可以直接通过例如 room[STRUCTURE_OBSERVER] 获取到对应的对象
 */
const SINGLE_STRUCTURES: AllRoomShortcut[] = [
    STRUCTURE_OBSERVER,
    STRUCTURE_POWER_SPAWN,
    STRUCTURE_EXTRACTOR,
    STRUCTURE_NUKER,
    STRUCTURE_FACTORY,
    'mineral'
]

/**
 * 所有在房间中会存在多个的建筑
 *
 * 可以直接通过例如 room[STRUCTURE_SPAWN] 获取到对应的对象**数组**
 */
const MULTIPLE_STRUCTURES: AllRoomShortcut[] = [
    STRUCTURE_SPAWN,
    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,
    STRUCTURE_WALL,
    STRUCTURE_RAMPART,
    STRUCTURE_KEEPER_LAIR,
    STRUCTURE_PORTAL,
    STRUCTURE_LINK,
    STRUCTURE_TOWER,
    STRUCTURE_LAB,
    STRUCTURE_CONTAINER,
    'source'
]

/**
 * 判断某个建筑类型是否为需要挂载的建筑类型
 *
 * @param type 要进行判断的建筑类型
 */
const isShortcutStructure = function(type: string): type is AllRoomShortcut {
    return ([
        ...SINGLE_STRUCTURES,
        ...MULTIPLE_STRUCTURES
    ] as string[]).includes(type)
}

/**
 * 全局建筑 Id 缓存
 *
 * 在全局重置后会运行 Room.find 获取建筑并将其 id 缓存在这里
 */
const structureIdCache: StructureIdCache = {}

/**
 * 获取缓存中的建筑 ID
 *
 * @param roomName 要查询的房间名
 * @param type 要查询的建筑类型
 */
const getCacheId = function(
    roomName: string,
    type: AllRoomShortcut
): Id<RoomObject>[] {
    if (!structureIdCache[roomName]) return undefined
    if (!structureIdCache[roomName][type]) return []

    return structureIdCache[roomName][type]
}

/**
 * 设置建筑 ID 缓存
 *
 * 本方法会直接 **替换** 目标位置的旧缓存
 *
 * @param roomName 要设置到的房间
 * @param type 要设置到的建筑类型
 * @param ids 要设置的 id
 */
const setCacheId = function(
    roomName: string,
    type: AllRoomShortcut,
    ids: Id<RoomObject>[]
) {
    if (!structureIdCache[roomName]) structureIdCache[roomName] = {}
    if (!structureIdCache[roomName][type]) structureIdCache[roomName][type] = []

    return (structureIdCache[roomName][type] = ids)
}

/**
 * 追加新的建筑缓存
 *
 * **新建筑造好后需要调用该方法**，
 * 该方法会将提供的缓存 id 追加到指定位置的缓存末尾
 *
 * @param roomName 房间名
 * @param type 要追加到的建筑类型
 * @param id 新的建筑 id
 */
export const updateStructure = function(
    roomName: string,
    type: string,
    id: Id<RoomObject>
) {
    // 传入的建筑类型有可能不需要挂载，这里剔除掉
    if (!isShortcutStructure(type)) return

    if (!structureIdCache[roomName]) structureIdCache[roomName] = {}
    if (!structureIdCache[roomName][type]) structureIdCache[roomName][type] = []

    structureIdCache[roomName][type].push(id)
    // 移除房间上的建筑对象缓存
    if (Game.rooms[roomName]) delete Game.rooms[roomName][getPrivateKey(type)]
}

/**
 * [核心实现] 获取指定房间的建筑缓存
 *
 * @param room 目标房间
 * @param type 要获取的建筑类型
 *
 * @returns 对应的建筑**数组**
 */
const getStructureWithCache = function<TargetStructure extends RoomObject>(
    room: Room,
    type: AllRoomShortcut
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

    // 从 id 获取建筑并更新缓存
    const target: TargetStructure[] = []
    const avaliableId = ids.filter((id: Id<TargetStructure>) => {
        const structure = Game.getObjectById(id)
        if (!structure) return false

        target.push(structure)
        return true
    })

    setCacheId(room.name, type, avaliableId)

    // 否则就暂存对象并返回
    room[privateKey] = target
    return target
}

/**
 * 获取指定房间的建筑缓存（从内存中保存的 id）
 *
 * @param room 目标房间
 * @param privateKey 建筑缓存在目标房间的键
 * @param memoryKey 建筑 id 在房间内存中对应的字段名
 * @returns 对应的建筑
 */
const getStructureWithMemory = function<TargetStructure extends RoomObject>(
    room: Room,
    privateKey: string,
    memoryKey: string
): TargetStructure {
    if (room[privateKey]) return room[privateKey]

    // 内存中没有 id 就说明没有该建筑
    if (!room.memory[memoryKey]) return undefined

    // 从 id 获取建筑并缓存
    const target: TargetStructure = Game.getObjectById(
        room.memory[memoryKey]
    ) as TargetStructure

    // 如果保存的 id 失效的话，就移除缓存
    if (!target) {
        delete room.memory[memoryKey]
        return undefined
    }

    // 否则就暂存对象并返回
    room[privateKey] = target
    return target
}

/**
 * 中央 link 访问器
 */
const centerLinkGetter = function(): StructureLink {
    return getStructureWithMemory<StructureLink>(
        this,
        '_centerLink',
        'centerLinkId'
    )
}

/**
 * 中央 link 访问器
 */
const upgradeLinkGetter = function(): StructureLink {
    return getStructureWithMemory<StructureLink>(
        this,
        '_upgradeLink',
        'upgradeLinkId'
    )
}

/**
 * 设置建筑快捷方式
 *
 * @param isSingle 要设置的是唯一建筑还是复数建筑
 * @returns 一个函数，接受要挂载的建筑类型，并挂载至房间上
 */
const setShortcut = function(isSingle: boolean) {
    return (type: AllRoomShortcut) => {
        Object.defineProperty(Room.prototype, type, {
            get() {
                const structures = getStructureWithCache(this, type)
                return isSingle ? structures[0] : structures
            },
            enumerable: false,
            configurable: true
        })
    }
}

/**
 * 获取指定键的私有键名
 *
 * @param key 要获取私有键名的键
 */
const getPrivateKey = (key) => `_${key}`

/**
 * 初始化指定房间的建筑缓存
 *
 * @param room 要初始化的房间
 */
const initShortcutCache = function(room: Room): void {
    structureIdCache[room.name] = {}

    // 查找建筑
    const structureGroup = _.groupBy(
        room.find(FIND_STRUCTURES),
        (s) => s.structureType
    )
    // 查找静态资源
    Object.assign(structureGroup, {
        mineral: room.find(FIND_MINERALS),
        source: room.find(FIND_SOURCES)
    })

    // 把需要的建筑 id 存入全局缓存，并直接初始化 room 缓存
    for (const type of [...MULTIPLE_STRUCTURES, ...SINGLE_STRUCTURES]) {
        // 如果房间内某种建筑还没有的话就填充为空数组
        structureIdCache[room.name][type] = (structureGroup[type] || []).map(
            (s) => s.id
        )
        room[getPrivateKey(type)] = structureGroup[type] || []
    }
}
