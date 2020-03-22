import { creepApi } from './creepController'
import { DEFAULT_FLAG_NAME, BOOST_STATE } from './setting'

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
    _.assign(Room.prototype, CreepControl.prototype)
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
 * 用于对房间内的运营 creep 进行管理
 */
class CreepControl extends Room {
    /**
     * 重新根据房间情况规划 creep 角色
     * 一般不需要调用，房间会自动发布需要的角色
     * 该方法在房间运营角色因某种故障不健全时手动调用来恢复正常的角色
     * 
     * @returns 规划详情
     */
    public planCreep(): string {
        let stats = [ `[${this.name}] 正在执行 creep 角色规划` ]
        // 如果没有 storage 的话说明房间还在初级阶段，发布几个小 creep
        if (!this.storage) {
            stats.push('未发现 storage，发布基础角色：harvester，upgrader')
            creepApi.add(`${this.name} harvester0`, 'harvester', {
                sourceId: this.sources[0].id
            }, this.name)
            creepApi.add(`${this.name} upgrader1`, 'upgrader', {
                sourceId: this.sources.length === 2 ? this.sources[1].id : this.sources[0].id
            }, this.name)

            return stats.join('\n')
        }
        
        // 有 storage 了，修改 harvester 和 upgrader 的目标建筑，发布 transfer
        stats.push('发现 storage，发布 collector，upgrader，transfer')
        creepApi.add(`${this.name} harvester0`, 'collector', {
            sourceId: this.sources[0].id
        }, this.name)
        if (this.sources.length >= 2) creepApi.add(`${this.name} harvester1`, 'collector', {
            sourceId: this.sources[1].id
        }, this.name)
        creepApi.add(`${this.name} upgrader1`, 'upgrader', {
            sourceId: this.storage.id
        }, this.name)
        creepApi.add(`${this.name} transfer`, 'transfer', {
            sourceId: this.storage.id
        }, this.name)

        // 如果有 centerLink 或者工厂或者终端，就说明中央集群已经出现，发布 centerTransfer
        if (!creepApi.has(`${this.name} centerTransfer`) && (this.memory.centerLinkId || this.factory || this.terminal)) stats.push(this.addCenterTransfer())

        return stats.join('\n')
    }

    /**
     * 发布中央物流管理员
     * 因为发布这个需要手动指定站桩位置，所以特地抽取出来方便手动执行
     */
    public addCenterTransfer(): string {
        const flagName = `${this.name} ct`
        const flag = Game.flags[flagName]
        if (!flag) return `[${this.name}] centerTransfer 发布失败，未找到名称为 [${flagName}] 的旗帜，请将其插在 centerTransfer 要站立的位置并重新执行 ${this.name}.addCenterTransfer()`

        // 发布 creep
        creepApi.add(`${this.name} centerTransfer`, 'centerTransfer', {
            x: flag.pos.x,
            y: flag.pos.y
        }, this.name)

        flag.remove()
        return `centerTransfer 添加成功，旗帜已移除`
    }

    /**
     * 发布外矿角色组
     * 
     * @param remoteRoomName 要发布 creep 的外矿房间
     */
    public addRemoteCreepGroup(remoteRoomName: string): void {
        const sourceFlagsName = [ `${remoteRoomName} source0`, `${remoteRoomName} source1` ]

        // 添加对应数量的外矿采集者
        sourceFlagsName.forEach((flagName, index) => {
            if (!(flagName in Game.flags)) return

            creepApi.add(`${remoteRoomName} remoteHarvester${index}`, 'remoteHarvester', {
                sourceFlagName: flagName,
                spawnRoom: this.name,
                targetId: this.memory.remote[remoteRoomName].targetId
            }, this.name)
        })

        this.addRemoteReserver(remoteRoomName)
    }

    /**
     * 发布房间预定者
     * 
     * @param remoteRoomName 要预定的外矿房间名
     */
    public addRemoteReserver(remoteRoomName): void {
        // 添加外矿预定者
        const reserverName = `${remoteRoomName} reserver`
        if (!creepApi.has(reserverName)) creepApi.add(reserverName, 'reserver', {
            targetRoomName: remoteRoomName
        }, this.name)
    }

    /**
     * 发布支援角色组
     * 
     * @param remoteRoomName 要支援的房间名
     */
    public addRemoteHelper(remoteRoomName): void {
        const room = Game.rooms[remoteRoomName]

        if (!room) return console.log(`[${this.name} 拓展] 目标房间没有视野，无法发布支援单位`)

        // 发布两个 upgrader
        creepApi.add(`${remoteRoomName} RemoteUpgrader0`, 'remoteUpgrader', {
            targetRoomName: remoteRoomName,
            sourceId: room.sources[0].id
        }, this.name)
        if (room.sources.length >= 2) creepApi.add(`${remoteRoomName} RemoteUpgrader1`, 'remoteUpgrader', {
            targetRoomName: remoteRoomName,
            sourceId: room.sources[0].id
        }, this.name)

        // 和一个 builder
        creepApi.add(`${remoteRoomName} RemoteBuilder1`, 'remoteBuilder', {
            targetRoomName: remoteRoomName,
            sourceId: room.sources.length >= 2 ? room.sources[1].id : room.sources[0].id
        }, this.name)
    }

    /**
     * 发布房间升级组
     * 升级组依靠 terminal 中传递来的能量进行升级
     * 
     * @param creepNum 新增升级组的 creep 数量
     * @returns ERR_NOT_FOUND 没有找到 terminal
     */
    public addUpgradeGroup(creepNum: number = 4): OK | ERR_NOT_FOUND {
        if (!this.terminal) return ERR_NOT_FOUND

        for (let i = 0; i < creepNum; i ++) {
            creepApi.add(`${this.name} terminalUpgrader ${i}`, 'upgrader', {
                sourceId: this.terminal.id
            }, this.name)
        }

        return OK
    }

    /**
     * 移除房间升级组
     * 
     * @param creepNum 要移除的升级组数量
     */
    public removeUpgradeGroup(creepNum: number = 4): void {
        for (let i = 0; i < creepNum; i ++) {
            creepApi.remove(`${this.name} terminalUpgrader ${i}`)
        }
    }

    /**
     * 移除 pb 采集小组配置项
     * @param attackerName 攻击单位名称
     * @param healerName 治疗单位名称
     */
    public removePbHarvesteGroup(attackerName: string, healerName: string): void {
        console.log('移除 pb 采集小组', attackerName, healerName)
        creepApi.remove(attackerName)
        creepApi.remove(healerName)
    }

    /**
     * 发布 pbTransfer 小组
     * 由 pbAttacker 调用
     * 
     * @param flagName powerBank 上的旗帜名
     * @param number 孵化几个 transfer
     */
    public spawnPbTransferGroup(flagName: string, number: number): void {
        console.log("添加 pb 运输小组", flagName, number)

        // 如果已经有人发布过了就不再费事了
        if (creepApi.has(`${flagName} transfer0`)) return
        
        for (let i = 0; i < number; i++) {
            creepApi.add(`${flagName} transfer${i}`, 'pbTransfer', {
                sourceFlagName: flagName,
                spawnRoom: this.name
            }, this.name)
        }
    }

    /**
     * 孵化 boost 进攻一体机
     * 
     * @param bearTowerNum 抗塔等级 0-6，等级越高扛伤能力越强，伤害越低
     * @param targetFlagName 目标旗帜名称
     * @param keepSpawn 是否持续生成
     */
    public spawnRangedAttacker(bearTowerNum: 0 | 1 | 3 | 5 | 2 | 4 | 6 = 6, targetFlagName: string = DEFAULT_FLAG_NAME.ATTACK, keepSpawn: boolean = false): string {
        if (!this.memory.boost) return `发布失败，未启动 Boost 进程，执行 ${this.name}.war() 来启动战争状态`
        if (this.memory.boost.state !== BOOST_STATE.WAIT_BOOST) return `无法发布，Boost 材料未准备就绪`

        const creepName = `${this.name} apocalypse ${Game.time}`
        creepApi.add(creepName, 'apocalypse', {
            targetFlagName: targetFlagName ? targetFlagName : DEFAULT_FLAG_NAME.ATTACK,
            bearTowerNum,
            keepSpawn
        }, this.name)

        return `已发布进攻一体机 [${creepName}] [扛塔等级] ${bearTowerNum} [进攻旗帜名称] ${targetFlagName} ${keepSpawn ? '' : '不'}持续生成`
    }

    /**
     * 孵化 boost 拆墙小组
     * 
     * @param targetFlagName 进攻旗帜名称
     * @param keepSpawn 是否持续生成
     */
    public spawnDismantleGroup(targetFlagName: string = '', keepSpawn: boolean = false): string {
        if (!this.memory.boost) return `发布失败，未启动 Boost 进程，执行 ${this.name}.war() 来启动战争状态`
        if (this.memory.boost.state !== BOOST_STATE.WAIT_BOOST) return `无法发布，Boost 材料未准备就绪`

        const dismantlerName = `${this.name} dismantler ${Game.time}`
        creepApi.add(dismantlerName, 'boostDismantler', {
            targetFlagName: targetFlagName ? targetFlagName : DEFAULT_FLAG_NAME.ATTACK,
            keepSpawn
        }, this.name)
        creepApi.add(`${this.name} doctor ${Game.time}`, 'boostDoctor', {
            creepName: dismantlerName,
            keepSpawn
        }, this.name)

        return `已发布拆墙小组，正在孵化`
    }

    /**
     * 孵化基础进攻单位
     * 
     * @param targetFlagName 进攻旗帜名称
     * @param num 要孵化的数量
     */
    public spwanSoldier(targetFlagName: string = '', num: number = 1) {
        if (num <=0 || num > 10) num = 1

        for (let i = 0; i < num; i++) {
            creepApi.add(`${this.name} dismantler ${Game.time}-${i}`, 'soldier', {
                targetFlagName: targetFlagName ? targetFlagName : DEFAULT_FLAG_NAME.ATTACK,
                keepSpawn: false
            }, this.name)
        }

        return `已发布 soldier*${num}，正在孵化`
    }
}

/**
 * 建筑工地拓展，主要作用就是发布 builder 来建造自己
 */
class ConstructionSiteExtension extends ConstructionSite {
    public work(): void {
        if (!this.room || this.room._hasRunConstructionSite) return
        this.room._hasRunConstructionSite = true

        const builderName = `${this.room.name} builder`
        if (creepApi.has(builderName)) return

        // 发布建筑工，有 storage 就优先用
        creepApi.add(builderName, 'builder', {
            sourceId: this.room.storage ? this.room.storage.id : this.room.sources[0].id
        }, this.room.name)
    }
}