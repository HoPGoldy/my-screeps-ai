/**
 * Room 快捷访问
 * 
 * 提供对房间内资源的快捷访问方式，如：W1N1.nuker、W1N1.sources 等
 * 包括唯一型建筑（Nuker、Factory ...）和自然资源（Source、Mineral ...）
 */

export default class RoomShortcut extends Room {
    /**
     * Mineral 访问器
     * 
     * 读取房间内存中的 mineralId 重建 Mineral 对象。
     * 如果没有该字段的话会自行搜索并保存至房间内存
     */
    public mineralGetter(): Mineral {
        if (this._mineral) return this._mineral

        // 如果内存中存有 id 的话就读取并返回
        // mineral 不会过期，所以不需要进行处理
        if (this.memory.mineralId) {
            this._mineral = Game.getObjectById(this.memory.mineralId)
            return this._mineral
        }

        // 没有 id 就进行搜索
        const mineral = this.find(FIND_MINERALS)[0]
        if (!mineral) {
            this.log(`异常访问，房间内没有找到 mineral`, 'roomBase', 'yellow')
            return undefined
        }

        // 缓存数据并返回
        this.memory.mineralId = mineral.id
        this._mineral = mineral
        return this._mineral
    }

    /**
     * Source 访问器
     * 
     * 工作机制同上 mineral 访问器
     */
    public sourcesGetter(): Source[] {
        if (this._sources) return this._sources

        // 如果内存中存有 id 的话就读取并返回
        // source 不会过期，所以不需要进行处理
        if (this.memory.sourceIds) {
            this._sources = this.memory.sourceIds.map(id => Game.getObjectById(id))
            return this._sources
        }

        // 没有 id 就进行搜索
        const sources = this.find(FIND_SOURCES)
        if (sources.length <= 0) {
            this.log(`异常访问，房间内没有找到 source`, 'roomBase', 'yellow')
            return []
        }

        // 缓存数据并返回
        this.memory.sourceIds = sources.map(s => s.id)
        this._sources = sources
        return this._sources
    }

    /**
     * source 旁的 container 访问器
     * 只会检查内存中是否存在对应 id，有的话就获取 container 实例，没有的话则不会主动搜索
     * 内存中的对应 id 由新建 container 的 harvester 角色上传
     */
    public sourceContainersGetter(): StructureContainer[] {
        if (this._sourceContainers) return this._sourceContainers

        // 内存中没有 id 就说明没有 container
        if (!this.memory.sourceContainersIds) return []

        // container 有可能会消失，每次获取时都要把废弃的 id 移除出内存
        const abandonedIdIndex = []

        const targets = this.memory.sourceContainersIds
            // 遍历 id，获取 container 实例
            .map((containerId, index) => {
                const container = Game.getObjectById(containerId)
                if (container) return container

                abandonedIdIndex.push(index)
                return false
            })
            // 去除所有为 false 的结果
            .filter(s => s)

        // 移除失效的 id
        abandonedIdIndex.forEach(index => this.memory.sourceContainersIds.splice(index, 1))
        if (this.memory.sourceContainersIds.length <= 0) delete this.memory.sourceContainersIds

        // 暂存对象并返回
        this._sourceContainers = targets as StructureContainer[]
        return this._sourceContainers
    }

    public factoryGetter(): StructureFactory {
        return getStructure<StructureFactory>(this, '_factory', 'factoryId')
    }

    public powerSpawnGetter(): StructurePowerSpawn {
        return getStructure<StructurePowerSpawn>(this, '_powerSpawn', 'powerSpawnId')
    }

    public nukerGetter(): StructureNuker {
        return getStructure<StructureNuker>(this, '_nuker', 'nukerId')
    }

    public observerGetter(): StructureObserver {
        return getStructure<StructureObserver>(this, '_observer', 'observerId')
    }

    public centerLinkGetter(): StructureLink {
        return getStructure<StructureLink>(this, '_centerLink', 'centerLinkId')
    }

    public extractorGetter(): StructureExtractor {
        return getStructure<StructureExtractor>(this, '_extractor', 'extractorId')
    }
}

/**
 * 获取并缓存建筑
 * 
 * @param room 目标房间
 * @param privateKey 建筑缓存在目标房间的键
 * @param memoryKey 建筑 id 在房间内存中对应的字段名
 * @returns 对应的建筑
 */
const getStructure = function<T>(room: Room, privateKey: string, memoryKey: string): T {
    if (room[privateKey]) return room[privateKey]

    // 内存中没有 id 就说明没有该建筑
    if (!room.memory[memoryKey]) return undefined
    
    // 从 id 获取建筑并缓存
    const target: T = Game.getObjectById(room.memory[memoryKey])

    // 如果保存的 id 失效的话，就移除缓存
    if (!target) {
        delete room.memory[memoryKey]
        return undefined
    }

    // 否则就暂存对象并返回
    room[privateKey] = target
    return target
}