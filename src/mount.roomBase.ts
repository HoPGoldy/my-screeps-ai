import { creepApi } from './creepController'
import { DEFAULT_FLAG_NAME, useTerminalUpraderLimit } from './setting'

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
        const secondSource = this.sources.length >= 2 ? this.sources[1] : this.sources[0]
        let stats = [ `[${this.name}] 正在执行 creep 角色规划` ]
        // 如果没有 storage 的话说明房间还在初级阶段，发布几个小 creep
        if (!this.storage) {
            stats.push('未发现 storage，发布基础角色：harvester，upgrader')
            creepApi.add(`${this.name} harvester0`, 'harvester', {
                sourceId: this.sources[0].id
            }, this.name)
            creepApi.add(`${this.name} upgrader1`, 'upgrader', {
                sourceId: secondSource.id
            }, this.name)

            return stats.join('\n')
        }
        
        // 有 storage 了，给 harvester 添加目标，并发布额外的 harvester
        stats.push('发现 storage，发布 collector，upgrader，transfer')
        for (let i = 0; i <= 3; i ++) {
            creepApi.add(`${this.name} harvester${i}`, 'harvester', {
                // 根据 i 来把 creep 平均分配到两个 source（如果有两个的话）
                sourceId: i % 2 ? this.sources[0].id : secondSource.id,
                targetId: this.storage.id
            }, this.name)
        }

        // RCL 大于 5 再发布 transfer
        if (this.controller.level >= 5) {
            creepApi.add(`${this.name} upgrader1`, 'upgrader', {
                sourceId: this.storage.id
            }, this.name)
            creepApi.add(`${this.name} transfer`, 'transfer', {
                sourceId: this.storage.id
            }, this.name)
        }

        // 如果有 centerLink 或者工厂或者终端，就说明中央集群已经出现，发布 centerTransfer
        if (!creepApi.has(`${this.name} centerTransfer`) && (this.memory.centerLinkId || this.factory || this.terminal)) stats.push(this.addCenterTransfer())

        return stats.join('\n')
    }

    /**
     * 规划 upgrader
     * 负责发布、移除、修改 upgrader 的能量来源
     */
    public planUpgrader() {
        // 可用的 upgrader 索引，重新规划后剩余的 upgrader 会被移除
        const availableIndex = [ 1, 2, 3, 4 ]
        // 快捷发布 upgrader
        const addUpgrader = (num: number, sourceId: string) => {
            for (let i = 0; i < num; i++) {
                creepApi.add(`${this.name} upgrader${availableIndex.shift()}`, 'upgrader', { sourceId }, this.name)
            }
        }

        // terminal 中能量足够
        if (this.terminal && this.terminal.store[RESOURCE_ENERGY] >= useTerminalUpraderLimit) {
            addUpgrader(this.controller.level >= 8 ? 1 : 2, this.terminal.id)
        }
        // 根据 storage 中能量余额进行发布
        else if (this.storage && this.storage.store[RESOURCE_ENERGY] > 100000) {
            const energy = this.storage.store[RESOURCE_ENERGY]

            /**
             * 数量配置项
             * @property {} energy 能量大于该值时启用本行配置
             * @property {} level8 房间等级8时发布的 upgrader 数量
             * @property {} levelOther 其他等级时发布的数量
             */
            const numberConfig = [
                { energy: 700000, level8: 1, levelOther: 4 },
                { energy: 500000, level8: 0, levelOther: 3 },
                { energy: 300000, level8: 0, levelOther: 2 },
                { energy: 100000, level8: 0, levelOther: 1 }
            ]
            
            // 遍历配置项进行 upgrader 发布
            numberConfig.find(config => {
                if (energy > config.energy) {
                    addUpgrader(this.controller.level >= 8 ? config.level8 : config.levelOther, this.storage.id)
                    return true
                }
                return false
            })
        }
        // 从 source 里取
        else {
            addUpgrader(1, this.sources[0].id)
            const secondSource = this.sources.length >= 2 ? this.sources[1] : this.sources[0]
            addUpgrader(1, secondSource.id)
        }

        // 移除未使用的 upgrader
        availableIndex.map(unuseIndex => creepApi.remove(`${this.name} upgrader${unuseIndex}`))
    }

    /**
     * 
     * @param upgraderName 要询问是否继续孵化的 upgrader 名称
     */
    public needUpgraderRespawn(upgraderName: string): boolean {
        if (upgraderName === `${this.name} upgrader1`) this.planCreep()

        return creepApi.has(upgraderName)
    }

    /**
     * 添加额外的初始房间工作队伍
     * 
     * @param upgrader 添加的升级单位数量
     * @param harvester 添加的填充单位数量
     */
    public addRise(upgrader: number = 5, harvester: number = 2): string {
        let creepNames = []
        /**
         * 要添加的角色配置项
         * @property roleName 角色名
         * @property number 要发布的角色数量
         * @property sourceIndex 要采集的 Source 索引
         */
        const RiseRoleConfigs = [
            { roleName: 'upgrader' as CreepRoleConstant, number: upgrader, sourceIndex: 0 },
            { roleName: 'harvester' as CreepRoleConstant, number: harvester, sourceIndex: this.sources.length > 1 ? 1 : 0 }
        ]
        
        // 遍历配置项，并用配置发布 Creep
        RiseRoleConfigs.forEach(roleConfig => {
            for (let i = 0; i < roleConfig.number; i++) {
                // 生成名字
                const creepName = `${this.name} rise${roleConfig.roleName} ${Game.time}-${i}`

                // 发布 creep
                creepApi.add(creepName, roleConfig.roleName, {
                    sourceId: this.sources[roleConfig.sourceIndex].id
                }, this.name)
    
                creepNames.push(creepName)
            }
        })

        return `[${this.name}] 已添加额外的工作 creep: 升级单位 ${upgrader} 个，填充单位 ${harvester} 个，名称如下：\n ${creepNames.join(', ')}`
    }

    /**
     * 移除额外的初始房间工作队伍
     */
    public removeRise() {
        // 额外的工作 creep 名称中都包含的关键字
        // 也就是说名字里有这个的 creep 都会被移除
        const RiseCreepKey = 'rise'

        if (!Memory.creepConfigs) return `未发现任何 creep 配置项`

        // 找到所有包含关键字的 creep 名称，并且在本房间中孵化
        const needRemoveCreeps: string[] = Object.keys(Memory.creepConfigs).filter(name => name.includes(RiseCreepKey) && Memory.creepConfigs[name].spawnRoom === this.name)
        // 将其移除
        needRemoveCreeps.forEach(name => creepApi.remove(name))

        return `[${this.name}] 已移除 ${needRemoveCreeps.length} 个额外的支援单位：${needRemoveCreeps.join(', ')}`
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
     * @param single 为 false 时将允许为一个房间发布多个预定者，为 true 时可以执行自动发布
     */
    public addRemoteReserver(remoteRoomName, single: boolean = true): void {
        // 添加外矿预定者
        const reserverName = `${remoteRoomName} reserver${single ? '' : Game.time}`
        if (!creepApi.has(reserverName)) creepApi.add(reserverName, 'reserver', {
            targetRoomName: remoteRoomName
        }, this.name)
    }

    /**
     * 给本房间签名
     * 
     * @param content 要签名的内容
     */
    public sign(content: string): string {
        const creepName = `${this.name} signer`
        const creep = Game.creeps[creepName]
        // 如果有显存的签名单位就直接签名
        if (creep) {
            (creep.memory.data as RemoteDeclarerData).signText = content
            return `已将 ${creepName} 的签名内容修改为：${content}`
        }
        // 否则就发布一个
        creepApi.add(creepName, 'signer', {
            targetRoomName: this.name,
            signText: content
        }, this.name)

        return `已发布 ${creepName}, 签名内容为：${content}`
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
        if (this.memory.boost.state !== 'waitBoost') return `无法发布，Boost 材料未准备就绪`

        const creepName = `${this.name} apocalypse ${Game.time}`
        creepApi.add(creepName, 'apocalypse', {
            targetFlagName: targetFlagName || DEFAULT_FLAG_NAME.ATTACK,
            bearTowerNum,
            keepSpawn
        }, this.name)

        return `已发布进攻一体机 [${creepName}] [扛塔等级] ${bearTowerNum} [进攻旗帜名称] ${targetFlagName} ${keepSpawn ? '' : '不'}持续生成，GoodLuck Commander`
    }

    /**
     * 孵化 boost 拆墙小组
     * 
     * @param targetFlagName 进攻旗帜名称
     * @param keepSpawn 是否持续生成
     */
    public spawnDismantleGroup(targetFlagName: string = '', keepSpawn: boolean = false): string {
        if (!this.memory.boost) return `发布失败，未启动 Boost 进程，执行 ${this.name}.war() 来启动战争状态`
        if (this.memory.boost.state !== 'waitBoost') return `无法发布，Boost 材料未准备就绪`

        const dismantlerName = `${this.name} dismantler ${Game.time}`
        creepApi.add(dismantlerName, 'boostDismantler', {
            targetFlagName: targetFlagName || DEFAULT_FLAG_NAME.ATTACK,
            keepSpawn
        }, this.name)
        creepApi.add(`${this.name} doctor ${Game.time}`, 'boostDoctor', {
            creepName: dismantlerName,
            keepSpawn
        }, this.name)

        return `已发布拆墙小组，正在孵化，GoodLuck Commander`
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
                targetFlagName: targetFlagName || DEFAULT_FLAG_NAME.ATTACK,
                keepSpawn: false
            }, this.name)
        }

        return `已发布 soldier*${num}，正在孵化`
    }

    /**
     * 孵化掠夺者
     * 
     * @param sourceFlagName 要搜刮的建筑上插好的旗帜名
     * @param targetStructureId 要把资源存放到的建筑 id
     */
    public spawnReiver(sourceFlagName: string = '', targetStructureId: string = ''): string {
        if (!targetStructureId && !this.terminal) return `[${this.name}] 发布失败，请填写要存放到的建筑 id`
        const reiverName = `${this.name} reiver ${Game.time}`
        creepApi.add(reiverName, 'reiver', {
            flagName: sourceFlagName || DEFAULT_FLAG_NAME.REIVER,
            targetId: targetStructureId || this.terminal.id
        }, this.name)

        return `[${this.name}] 掠夺者 ${reiverName} 已发布, 目标旗帜名称 ${sourceFlagName || DEFAULT_FLAG_NAME.REIVER}, 将搬运至 ${targetStructureId ? targetStructureId : this.name + ' Terminal'}`
    }
}

/**
 * 建筑工地拓展，主要作用就是发布 builder 来建造自己
 */
class ConstructionSiteExtension extends ConstructionSite {
    public work(): void {
        if (!this.room || this.room._hasRunConstructionSite) return
        this.room._hasRunConstructionSite = true
        // 如果房间自己没 claim 的话就不发布 builder
        if (!this.room.controller.owner || this.room.controller.owner.username !== this.owner.username) return

        const builderName = `${this.room.name} builder`
        if (creepApi.has(builderName)) return

        // 发布建筑工，有 storage 就优先用
        creepApi.add(builderName, 'builder', {
            sourceId: this.room.storage ? this.room.storage.id : this.room.sources[0].id
        }, this.room.name)
    }
}