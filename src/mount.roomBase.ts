/**
 * 将所有的房间基础服务挂载至 Room 原型上
 * 详细信息见下文 RoomBase 注释
 * 
 * 注意此处没有直接在 RoomBase 中定义 getter 然后签入 Room.prototype
 * 是因为这样做编译后会错误的直接执行所有 getter 并且后续无法使用，暂时没有发现解决办法
 * 老版本的挂载方式见 commit id: ea75cfa66eb16e86640fe1300c40e0313d35b4e5
 */
export default function () {
    // 遍历 RoomBase 所有属性，并挂载 Room 原型上不存在的属性
    for (const key in RoomBase.prototype) {
        if (key in Room.prototype) continue

        // 挂载属性的 get 访问器
        Object.defineProperty(Room.prototype, key, {
            get: RoomBase.prototype[key],
            enumerable: false,
            configurable: true
        })
    }
}

/**
 * Room 基础服务
 * 提供对房间内资源的快捷访问方式，如：W1N1.nuker、W1N1.sources 等
 * 
 * 本服务包括唯一型建筑（Nuker、Factory ...）
 * 和自然资源（Source、Mineral ...）
 */
class RoomBase extends Room {
    // 资源和建筑的非持久缓存
    private _factory: StructureFactory
    private _mineral: Mineral
    private _powerspawn: StructurePowerSpawn
    private _nuker: StructureNuker
    private _sources: Source[]

    /**
     * factory 访问器
     * 
     * 该访问器只会读取房间内存中的 factoryId 字段来获取工厂对象，并不会主动 find。
     * 这么做是为了避免房间内没有工厂时每 tick 都 find 从而造成资源浪费。
     * factoryId 由 StructureFactory 写入
     */
    public factory(): StructureFactory | undefined {
        if (this._factory) return this._factory

        // 如果没有缓存就检查内存中是否存有 id
        if (this.memory.factoryId) {
            let factory: StructureFactory = Game.getObjectById(this.memory.factoryId)

            // 如果保存的 id 失效的话，就移除缓存
            if (!factory) {
                delete this.memory.factoryId
                return undefined
            }

            // 否则就暂存对象并返回
            this._factory = factory
            return factory
        }

        // 内存中没有 id 就说明没有 factory
        return undefined
    }

    /**
     * powerSpawn 访问器
     * 
     * 工作机制同上 factory 访问器
     */
    public powerSpawn(): StructurePowerSpawn | undefined {
        if (this._powerspawn) return this._powerspawn

        // 如果没有缓存就检查内存中是否存有 id
        if (this.memory.powerSpawnId) {
            let powerSpawn: StructurePowerSpawn = Game.getObjectById(this.memory.powerSpawnId)

            // 如果保存的 id 失效的话，就移除缓存
            if (!powerSpawn) {
                delete this.memory.powerSpawnId
                return undefined
            }

            // 否则就暂存对象并返回
            this._powerspawn = powerSpawn
            return powerSpawn
        }

        // 内存中没有 id 就说明没有 powerSpawn
        return undefined
    }

    /**
     * nuker 访问器
     * 
     * 工作机制同上 factory 访问器
     */
    public nuker(): StructureNuker | undefined {
        if (this._nuker) return this._nuker

        // 如果没有缓存就检查内存中是否存有 id
        if (this.memory.nukerId) {
            let nuker: StructureNuker = Game.getObjectById(this.memory.nukerId)

            // 如果保存的 id 失效的话，就移除缓存
            if (!nuker) {
                delete this.memory.nukerId
                return undefined
            }

            // 否则就暂存对象并返回
            this._nuker = nuker
            return nuker
        }

        // 内存中没有 id 就说明没有 powerSpawn
        return undefined
    }

    /**
     * Mineral 访问器
     * 
     * 读取房间内存中的 mineralId 重建 Mineral 对象。
     * 如果没有该字段的话会自行搜索并保存至房间内存
     */
    public mineral(): Mineral | undefined {
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
            console.log(`[${this.name} base] 异常访问，房间内没有找到 mineral`)
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
    public sources(): Source[] | undefined {
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
            console.log(`[${this.name} base] 异常访问，房间内没有找到 source`)
            return undefined
        }

        // 缓存数据并返回
        this.memory.sourceIds = sources.map(s => s.id)
        this._sources = sources
        return this._sources
    }
}