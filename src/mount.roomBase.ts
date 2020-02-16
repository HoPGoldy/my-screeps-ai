import { creepApi } from './creepController'

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
        // 这里通过处理 key 的名字，把 factoryGetter 等访问器挂载到 factory 属性的 get 方法上
        // 这么做的原因是为了避免访问器的类型和 index.d.ts 中定义冲突从而导致 ts 报错
        Object.defineProperty(Room.prototype, key.split('Getter')[0], {
            get: RoomBase.prototype[key],
            enumerable: false,
            configurable: true
        })
    }

    _.assign(ConstructionSite.prototype, ConstructionSiteExtension.prototype)
    _.assign(Room.prototype, CreepGroup.prototype)
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
    private _centerLink: StructureLink
    private _observer: StructureObserver

    /**
     * factory 访问器
     * 
     * 该访问器只会读取房间内存中的 factoryId 字段来获取工厂对象，并不会主动 find。
     * 这么做是为了避免房间内没有工厂时每 tick 都 find 从而造成资源浪费。
     * factoryId 由 StructureFactory 写入
     */
    public factoryGetter(): StructureFactory | undefined {
        if (this._factory) return this._factory

        // 如果没有缓存就检查内存中是否存有 id
        if (this.memory.factoryId) {
            const factory: StructureFactory = Game.getObjectById(this.memory.factoryId)

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
    public powerSpawnGetter(): StructurePowerSpawn | undefined {
        if (this._powerspawn) return this._powerspawn

        // 如果没有缓存就检查内存中是否存有 id
        if (this.memory.powerSpawnId) {
            const powerSpawn: StructurePowerSpawn = Game.getObjectById(this.memory.powerSpawnId)

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
    public nukerGetter(): StructureNuker | undefined {
        if (this._nuker) return this._nuker

        // 如果没有缓存就检查内存中是否存有 id
        if (this.memory.nukerId) {
            const nuker: StructureNuker = Game.getObjectById(this.memory.nukerId)

            // 如果保存的 id 失效的话，就移除缓存
            if (!nuker) {
                delete this.memory.nukerId
                return undefined
            }

            // 否则就暂存对象并返回
            this._nuker = nuker
            return nuker
        }

        // 内存中没有 id 就说明没有 nuker
        return undefined
    }

    /**
     * observer 访问器
     * 
     * 工作机制同上 factory 访问器
     */
    public observerGetter(): StructureObserver | undefined {
        if (this._observer) return this._observer

        // 如果没有缓存就检查内存中是否存有 id
        if (this.memory.observerId) {
            const observer: StructureObserver = Game.getObjectById(this.memory.observerId)

            // 如果保存的 id 失效的话，就移除缓存
            if (!observer) {
                delete this.memory.observerId
                return undefined
            }

            // 否则就暂存对象并返回
            this._observer = observer
            return observer
        }

        // 内存中没有 id 就说明没有 nuker
        return undefined
    }

    /**
     * centerLink 访问器
     * 
     * 工作机制同上 factory 访问器
     * centerLinkId 是玩家执行 Link.asCenter() 时添加的
     */
    public centerLinkGetter(): StructureLink | undefined {
        if (this._centerLink) return this._centerLink

        // 如果没有缓存就检查内存中是否存有 id
        if (this.memory.centerLinkId) {
            const centerLink: StructureLink = Game.getObjectById(this.memory.centerLinkId)

            // 如果保存的 id 失效的话，就移除缓存
            if (!centerLink) {
                delete this.memory.centerLinkId
                return undefined
            }

            // 否则就暂存对象并返回
            this._centerLink = centerLink
            return centerLink
        }

        // 内存中没有 id 就说明没有 centerLink
        return undefined
    }

    /**
     * Mineral 访问器
     * 
     * 读取房间内存中的 mineralId 重建 Mineral 对象。
     * 如果没有该字段的话会自行搜索并保存至房间内存
     */
    public mineralGetter(): Mineral | undefined {
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
    public sourcesGetter(): Source[] | undefined {
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

/**
 * 本房间可以发布的角色组
 * 拓展在 Room 原型上，不直接由对应建筑发布的原因是集中到这里方便玩家万一出现问题时可以手动更新
 */
class CreepGroup extends Room {
    public addBaseGroup(): void {
        creepApi.add(`${this.name} harvester1`, 'harvester', {
            sourceId: this.sources[0].id
        }, this.name)
        creepApi.add(`${this.name} upgrader1`, 'upgrader', {
            sourceId: this.sources.length === 2 ? this.sources[1].id : this.sources[0].id
        }, this.name)
    }

    public addAdvancedGroup(): void {
        creepApi.add(`${this.name} harvester1`, 'collector', {
            sourceId: this.sources[0].id
        }, this.name)
        if (this.sources.length >= 2) creepApi.add(`${this.name} harvester2`, 'collector', {
            sourceId: this.sources[1].id
        }, this.name)
        creepApi.add(`${this.name} upgrader1`, 'upgrader', {
            sourceId: this.storage.id
        }, this.name)
        creepApi.add(`${this.name} transfer`, 'transfer', {
            sourceId: this.storage.id
        }, this.name)
    }
}

/**
 * 建筑工地拓展，主要作用就是发布 builder 来建造自己
 */
class ConstructionSiteExtension extends ConstructionSite {
    public work(): void {
        if (this.room._hasRunConstructionSite) return
        this.room._hasRunConstructionSite = true

        const builderName = `${this.room.name} builder`
        if (creepApi.has(builderName)) return

        creepApi.add(builderName, 'builder', {
            sourceId: this.room.sources[0].id
        }, this.room.name)
    }
}