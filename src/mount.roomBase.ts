export default function () {
    _.assign(Room.prototype, RoomBase.prototype)
}

/**
 * Room 基础服务
 * 
 * 包括唯一型建筑（Nuker、Factory ...）
 * 和无法修改型建筑（Source、Mineral ...）
 */
class RoomBase extends Room {
    // 工厂非持久缓存
    private _factory: StructureFactory
    // 元素矿非持久缓存
    private _mineral: Mineral

    /**
     * factory 访问器
     * 
     * 该访问器只会读取房间内存中的 factoryId 字段来获取工厂对象，并不会主动 find。
     * 这么做是为了避免房间内没有工厂时每 tick 都 find 从而造成资源浪费。
     * factoryId 由 StructureFactory 写入
     */
    get factory(): StructureFactory | undefined {
        if (this._factory) return this.factory

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
     * mineral 访问器
     * 
     * 读取房间内存中的 mineralId 重建 Mineral 对象。
     * 如果没有该字段的话会自行搜索
     */
    get mineral(): Mineral | undefined {
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
}