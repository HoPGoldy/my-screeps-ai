import roles from './role'
import { creepApi } from './creepController'
import { createHelp } from './utils'
import { 
    // spawn 孵化相关
    bodyConfigs, creepDefaultMemory, 
    // tower 维修相关
    repairSetting,
    // storage 相关
    ENERGY_SHARE_LIMIT,
    // powerSpawn 相关
    powerSettings,
    // 房间物流任务
    ROOM_TRANSFER_TASK,
    // 统计间隔
    stateScanInterval,
    // observer 相关
    observerInterval,
    DEPOSIT_MAX_COOLDOWN,
    // 挂载内存相关
    structureWithMemory
} from './setting'

import LabExtension from './mount.lab'
import FactoryExtension from './mount.factory'
import TerminalExtension from './mount.terminal'

// 挂载拓展到建筑原型
export default function () {
    mountMemory()

    _.assign(StructureSpawn.prototype, SpawnExtension.prototype)
    _.assign(StructureTower.prototype, TowerExtension.prototype)
    _.assign(StructureLink.prototype, LinkExtension.prototype)
    _.assign(StructureFactory.prototype, FactoryExtension.prototype)
    _.assign(StructureTerminal.prototype, TerminalExtension.prototype)
    _.assign(StructureExtractor.prototype, ExtractorExtension.prototype)
    _.assign(StructureStorage.prototype, StorageExtension.prototype)
    _.assign(StructureLab.prototype, LabExtension.prototype)
    _.assign(StructureNuker.prototype, NukerExtension.prototype)
    _.assign(StructurePowerSpawn.prototype, PowerSpawnExtension.prototype)
    _.assign(StructureObserver.prototype, ObserverExtension.prototype)   
    _.assign(StructureController.prototype, ControllerExtension.prototype)
}

/**
 * 给指定建筑挂载内存
 * 要挂载内存的建筑定义在 setting.ts 中的 structureWithMemory 里
 */
function mountMemory(): void {
    structureWithMemory.forEach(structureConfig => {
        const memoryKey = structureConfig.memoryKey

        // 给指定原型挂载属性 memory
        Object.defineProperty(structureConfig.poto.prototype, 'memory', {
            configurable: true,
            // cpu 消耗：MAX 0.01 AVG 0.009 MIN 0.004
            // structure.memory.a = 1 这种赋值实际上调用的是这里的 getter
            get: function() {
                if(!this.room.memory[memoryKey]) this.room.memory[memoryKey] = {}
                return this.room.memory[memoryKey]
            },
            // cpu 消耗：AVG 0.02
            set: function(value) {
                if(!this.room.memory[memoryKey]) this.room.memory[memoryKey] = {}
    
                this.room.memory[memoryKey] = value
            }
        })
    })
}

/**
 * Spawn 原型拓展
 */
class SpawnExtension extends StructureSpawn {
    /**  
     * spawn 主要工作
     * @todo 能量不足时挂起任务
     */
    public work(): void {
        if (this.spawning) {
            /**
             * 如果孵化已经开始了，就向物流队列推送任务
             * 不在 mySpawnCreep 返回 OK 时判断是因为：
             * 由于孵化是在 tick 末的行动执行阶段进行的，所以能量在 tick 末期才会从 extension 中扣除
             * 如果返回 OK 就推送任务的话，就会出现任务已经存在了，而 extension 还是满的
             * 而 creep 恰好就是在这段时间里执行的物流任务，就会出现：
             * mySpawnCreep 返回 OK > 推送填充任务 > creep 执行任务 > 发现能量都是满的 > 移除任务 > tick 末期开始孵化 > extension 扣除能量的错误逻辑
             */
            if (this.spawning.needTime - this.spawning.remainingTime == 1) {
                this.room.addRoomTransferTask({ type: ROOM_TRANSFER_TASK.FILL_EXTENSION }, 1)
                this.room.addPowerTask(PWR_OPERATE_EXTENSION, 1)
            }
            return
        }
        if (!this.room.memory.spawnList) this.room.memory.spawnList = []
        // 生成中共 / 生产队列为空 就啥都不干
        if (this.spawning || this.room.memory.spawnList.length == 0) return 
        // 进行生成
        const spawnResult: MySpawnReturnCode = this.mySpawnCreep(this.room.memory.spawnList[0])

        // 生成成功后移除任务
        if (spawnResult == OK) this.room.memory.spawnList.shift()
    }

    /**
     * 从 spawn 生产 creep
     * 
     * @param configName 对应的配置名称
     * @returns Spawn.spawnCreep 的返回值
     */
    private mySpawnCreep(configName): MySpawnReturnCode {
        // 如果配置列表中已经找不到该 creep 的配置了 则直接移除该生成任务
        const creepConfig = Memory.creepConfigs[configName]
        if (!creepConfig) return OK
        // 找不到他的工作逻辑的话也直接移除任务
        const creepWork = roles[creepConfig.role](creepConfig.data)
        if (!creepWork) return OK
        
        // 检查是否需要生成
        // if (creepConfig.isNeed) {
        //     // 每 5 tick 才会检查一次
        //     if (Game.time % 5) {
        //         if (this.room.memory.spawnList.length > 1) this.room.hangSpawnTask()
        //         return <CREEP_DONT_NEED_SPAWN>-101
        //     }
        //     // 检查不通过依旧会挂起
        //     else if (!creepConfig.isNeed(this.room)) {
        //         if (this.room.memory.spawnList.length > 1) this.room.hangSpawnTask()
        //         return <CREEP_DONT_NEED_SPAWN>-101
        //     }
        // }

        // 设置 creep 内存
        let creepMemory: CreepMemory = _.cloneDeep(creepDefaultMemory)
        creepMemory.role = creepConfig.role
        creepMemory.data = creepConfig.data

        // 获取身体部件, 优先使用 bodys
        const bodys = (typeof creepWork.bodys === 'string') ? this.getBodys(creepConfig.bodys as string) : creepConfig.bodys as BodyPartConstant[]
        if (bodys.length <= 0) {
            this.room.hangSpawnTask()
            return ERR_NOT_ENOUGH_ENERGY
        }
        
        const spawnResult: ScreepsReturnCode = this.spawnCreep(bodys, configName, {
            memory: creepMemory
        })
        // 检查是否生成成功
        if (spawnResult == OK) {
            // console.log(`${creepConfig.spawn} 正在生成 ${configName} ...`)
            return OK
        }
        else if (spawnResult == ERR_NAME_EXISTS) {
            console.log(`${configName} 已经存在 ${creepConfig.spawnRoom} 将不再生成 ...`)
            return OK
        }
        else {
            console.log(`[生成失败] ${creepConfig.spawnRoom} 任务 ${configName} 挂起, 错误码 ${spawnResult}`)
            return spawnResult
        }
    }

    /**
     * 获取身体部件数组
     * 
     * @param bodyType creepConfig 中的 bodyType
     */
    private getBodys(bodyType: string): BodyPartConstant[] {
        const bodyConfig: BodyConfig = bodyConfigs[bodyType]

        const targetLevel = Object.keys(bodyConfig).reverse().find(level => {
            // 先通过等级粗略判断，再加上 dryRun 精确验证
            const availableEnergyCheck = (Number(level) <= this.room.energyAvailable)
            const dryCheck = (this.spawnCreep(bodyConfig[level], 'bodyTester', { dryRun: true }) == OK)

            return availableEnergyCheck && dryCheck
        })
        if (!targetLevel) return [ ]

        // 获取身体部件
        const bodys: BodyPartConstant[] = bodyConfig[targetLevel]

        return bodys
    }
}

// Tower 原型拓展
class TowerExtension extends StructureTower {
    /**
     * 主要任务
     */
    public work(): void {
        if (this.store[RESOURCE_ENERGY] > 10) {
            // 告诉房间内的 repairer 不用再维修了
            if (!this.room._towerShoulderRepair) this.room._towerShoulderRepair = true

            // 先攻击敌人
            if (this.commandAttack()) { }
            // 找不到敌人再维修建筑
            else if (this.commandRepair()) { }
            // 找不到要维修的建筑就刷墙
            else if (this.commandFillWall()) { }
        }
    }

    /**
     * 攻击指令
     * 检查本房间是否有敌人，有的话则攻击
     * 
     * @returns 有敌人返回 true，没敌人返回 false
     */
    private commandAttack(): boolean {
        // 使用缓存
        if (!this.room._enemys) this.room._enemys = this.room.find(FIND_HOSTILE_CREEPS)
        // 从缓存中读取
        if (this.room._enemys.length > 0) {
            const target = this.pos.findClosestByRange(this.room._enemys)
            this.attack(target)

            // 如果能量低了就发布填充任务
            if (this.store[RESOURCE_ENERGY] <= 900) this.room.addRoomTransferTask({ type: ROOM_TRANSFER_TASK.FILL_TOWER, id: this.id })
            return true
        }
        else return false
    }

    /**
     * 维修指令
     * 维修受损的建筑，不维修 WALL 和 RAMPART
     * 
     * @returns 进行维修返回 true，没有维修返回 false
     */
    private commandRepair(): boolean {
        // 还没到检查时间就跳过
        if (Game.time % repairSetting.checkInterval) return false

        // 找到受损建筑
        // 没有缓存就进行搜索
        if (!this.room._damagedStructure) {
            const damagedStructures = <AnyStructure[]>this.room.find(FIND_STRUCTURES, {
                filter: s => s.hits < s.hitsMax && s.structureType != STRUCTURE_RAMPART && s.structureType != STRUCTURE_WALL
            })

            // 找到最近的受损建筑并更新缓存
            if (damagedStructures.length > 0) {
                this.room._damagedStructure = this.pos.findClosestByRange(damagedStructures)
            }
            else {
                this.room._damagedStructure = 1
                return false
            }
        }
        
        // 代码能执行到这里就说明缓存肯定不为空
        // 如果是 1 说明都不需要维修
        if (this.room._damagedStructure != 1) {
            this.repair(this.room._damagedStructure)
            // 这里把需要维修的建筑置为 1 是为了避免其他的 tower 奶一个满血建筑从而造成 cpu 浪费
            if (this.room._damagedStructure.hits + 500 >= this.room._damagedStructure.hitsMax) this.room._damagedStructure = 1

            // 如果能量低了就发布填充任务
            if (this.store[RESOURCE_ENERGY] <= 600) this.room.addRoomTransferTask({ type: 'fillTower', id: this.id})

            return true
        }
        return false
    }

    /**
     * 刷墙指令
     * 维修 WALL 和 RAMPART
     * 
     * @returns 要刷墙返回 true，否则返回 false
     */
    private commandFillWall(): boolean {
        // 还没到检查时间跳过
        if (Game.time % repairSetting.wallCheckInterval) return false
        // 如果有 tower 已经刷过墙了就跳过
        if (this.room._hasFillWall) return false
        // 能量不够跳过
        if (this.store[RESOURCE_ENERGY] < repairSetting.energyLimit) return false

        const focusWall = this.room.memory.focusWall
        let targetWall: StructureWall | StructureRampart = null
        // 该属性不存在 或者 当前时间已经大于关注时间 就刷新
        if (!focusWall || (focusWall && Game.time >= focusWall.endTime)) {
            // 获取所有没填满的墙
            const walls = <(StructureWall | StructureRampart)[]>this.room.find(FIND_STRUCTURES, {
                filter: s => (s.hits < s.hitsMax) && 
                    (s.structureType == STRUCTURE_WALL || s.structureType == STRUCTURE_RAMPART)
            })
            // 没有目标就啥都不干
            if (walls.length <= 0) return false

            // 找到血量最小的墙
            targetWall = walls.sort((a, b) => a.hits - b.hits)[0]

            // 将其缓存在内存里
            this.room.memory.focusWall = {
                id: targetWall.id,
                endTime: Game.time + repairSetting.focusTime
            }
        }

        // 获取墙壁
        if (!targetWall) targetWall = Game.getObjectById(focusWall.id)
        // 如果缓存里的 id 找不到墙壁，就清除缓存下次再找
        if (!targetWall) {
            delete this.room.memory.focusWall
            return false
        }

        // 填充墙壁
        this.repair(targetWall)

        // 如果能量低了就发布填充任务
        if (this.store[RESOURCE_ENERGY] <= 600) this.room.addRoomTransferTask({ type: 'fillTower', id: this.id})

        // 标记一下防止其他 tower 继续刷墙
        this.room._hasFillWall = true
        return true
    }
}

// Link 原型拓展
class LinkExtension extends StructureLink {
    /**
     * link 主要工作
     */
    public work(): void {
        // 冷却好了再执行
        if (this.cooldown != 0) return
        // 兜底
        if (!this.room.memory.links) this.room.memory.links = {}

        // 读配置项
        const linkWorkFunctionName: string = this.room.memory.links[this.id]
        if (!linkWorkFunctionName) return console.log(`[空闲 link] 请为 ${this.id} 分配角色`)
        
        if (this[linkWorkFunctionName]) this[linkWorkFunctionName]()
    }

    /**
     * 用户操作: 注册为源 link
     */
    public asSource(): string {
        this.clearRegister()
        if (!this.room.memory.links) this.room.memory.links = {}

        this.room.memory.links[this.id] = 'sourceWork'

        const inRangeSources = this.pos.findInRange(FIND_SOURCES, 2)
        inRangeSources.forEach(source => {
            const index = this.room.memory.sourceIds.indexOf(source.id)
            console.log("TCL: LinkExtension -> index", index, source.id)

            creepApi.add(`${this.room.name} harvester${index}`, 'collector', {
                sourceId: this.room.sources[index].id,
                targetId: this.id
            }, this.room.name)
            
            console.log(`${this.room.name} harvester${index} 已将目标修改为该 sourceLink`)
        })

        return `${this} 已注册为源 link`
    }

    /**
     * 用户操作: 注册为中央 link
     */
    public asCenter(): string {
        this.clearRegister()
        if (!this.room.memory.links) this.room.memory.links = {}

        this.room.memory.links[this.id] = 'centerWork'
        this.room.memory.centerLinkId = this.id

        // 注册中央 link 的同时发布 centerTransfer
        return `${this} 已注册为中央 link\n` + this.room.addCenterTransfer()
    }

    /**
     * 用户操作: 注册为升级 link
     * 
     * 自己被动的给 upgrader 角色提供能量，所以啥也不做
     * 只是在房间内存里注册来方便其他 link 找到自己
     */
    public asUpgrade(): string {
        this.clearRegister()

        if (!this.room.memory.links) this.room.memory.links = {}
        // upgradeWork 方法不存在 所以它什么也不做
        this.room.memory.links[this.id] = 'upgradeWork'
        this.room.memory.upgradeLinkId = this.id
        return `${this} 已注册为升级 link`
    }

    /**
     * 用户操作: 帮助
     */
    public help(): string {
        return createHelp([
            {
                title: '注册为源 link',
                functionName: 'asSource'
            },
            {
                title: '注册为中央 link',
                functionName: 'asCenter'
            },
            {
                title: '注册为升级 link',
                functionName: 'asUpgrade'
            }
        ])
    }

    /**
     * 每次使用三个 as 时都要调用
     * 防止同时拥有多个角色
     */
    private clearRegister() {
        if (this.room.memory.centerLinkId == this.id) delete this.room.memory.centerLinkId
        if (this.room.memory.upgradeLinkId == this.id) delete this.room.memory.upgradeLinkId
        if (this.room.memory.links && this.room.memory.links.hasOwnProperty(this.id)) delete this.room.memory.links[this.id]
    }

    /**
     * 扮演中央 link
     * 
     * 否则向房间中的资源转移队列推送任务
     */
    private centerWork(): void {
        // 能量为空则待机
        if (<number>this.store.getCapacity(RESOURCE_ENERGY) == 0) return
        // 之前发的转移任务没有处理好的话就先挂机
        if (this.room.hasCenterTask('centerLink') || !this.room.storage) return 

        this.room.addCenterTask({
            submit: 'centerLink',
            source: 'centerLink',
            target: STRUCTURE_STORAGE,
            resourceType: RESOURCE_ENERGY,
            amount: this.store[RESOURCE_ENERGY]
        })
    }

    /**
     * 扮演能量提供 link
     * 
     * 如果房间内有 upgrede link 并且其没有能量时则把自己的能量转移给它
     * 否则向中央 link 发送能量
     * 都不存在时待机
     */
    private sourceWork(): void {
        // 能量填满再发送
        if (<number>this.store.getCapacity(RESOURCE_ENERGY) != LINK_CAPACITY) return
        // 优先响应 upgrade
        if (this.room.memory.upgradeLinkId) {
            const upgradeLink = this.getLinkByMemoryKey('upgradeLinkId')
            // 如果 upgrade link 没能量了就转发给它
            if (upgradeLink && upgradeLink.store[RESOURCE_ENERGY] == 0) {
                this.transferEnergy(upgradeLink) 
                return
            }
        }
        // 发送给 center link
        if (this.room.memory.centerLinkId) {
            const centerLink = this.getLinkByMemoryKey('centerLinkId')
            if (!centerLink || centerLink.store[RESOURCE_ENERGY] >= 799) return

            this.transferEnergy(centerLink)
        }
    }

    /**
     * 通过 room.memory 中指定字段名中的值获取 link
     * 如果没有找到对应的 link id 的话则清除该字段
     * @danger 请不要把该方法用在查找 link 之外的地方
     * 
     * @param memoryKey link 的 id 保存在哪个 room.memory 字段中
     */
    private getLinkByMemoryKey(memoryKey: string): StructureLink | null {
        const linkId = this.room.memory[memoryKey]
        if (!linkId) return null
        const link: StructureLink = Game.getObjectById(linkId)
        // 不存在说明 link 已经被摧毁了 清理并退出
        if (!link) {
            delete this.room.memory[memoryKey]
            delete this.room.memory.links[linkId]
            return null
        }
        else return link
    }
}

/**
 * Extractor 拓展
 * 
 * 在刚刚建成时会在房间内存里写入 mineral 的 id
 * 并在资源来源表里注册自己
 */
class ExtractorExtension extends StructureExtractor {
    public work(): void {
        // 下面两行确保 work 只执行一次
        if (this.room.memory.extractorId) return
        this.room.memory.extractorId = this.id

        // 获取 mineral 并将其 id 保存至房间内存
        const targets = this.room.find(FIND_MINERALS)
        const mineral = targets[0]
        this.room.memory.mineralId = mineral.id

        // 兜底
        if (!Memory.resourceSourceMap) Memory.resourceSourceMap = {}
        if (!Memory.resourceSourceMap[mineral.mineralType]) Memory.resourceSourceMap[mineral.mineralType] = []
        
        // 在资源来源表里进行注册
        this.room.shareAddSource(mineral.mineralType)
    }
}

/**
 * Storage 拓展
 * 
 * storage 会对自己中的能量进行监控，如果大于指定量（ENERGY_SHARE_LIMIT）的话
 * 就将自己注册到资源来源表中为其他房间提供能量
 */
class StorageExtension extends StructureStorage {
    public work(): void {
        this.stateScanner()

        if (Game.time % 10000) return

        if (this.store[RESOURCE_ENERGY] >= ENERGY_SHARE_LIMIT) this.room.shareAddSource(RESOURCE_ENERGY)
    }

    /**
     * 统计自己存储中的剩余能量
     */
    private stateScanner(): void {
        if (Game.time % stateScanInterval) return
        if (!this.room.memory.stats) this.room.memory.stats = {}

        this.room.memory.stats.energy = this.store[RESOURCE_ENERGY]
    }

    /**
     * 建筑完成时以自己为中心发布新的 creep 运维组
     */
    public onBuildComplete(): void {
        this.room.planCreep()
    }
}

/**
 * Controller 拓展
 * 统计当前升级进度、移除无效的禁止通行点位
 */
class ControllerExtension extends StructureController {
    public work(): void {
        if (Game.time % stateScanInterval) return
        // 是否无效的禁止通行点位
        if (!(Game.time % 10000)) this.checkRestrictedPos()

        // 如果等级发生变化了就运行 creep 规划
        if (this.stateScanner()) this.planCreep()
    }

    /**
     * 统计自己的等级信息
     * 
     * @returns 为 true 时说明自己等级发生了变化
     */
    private stateScanner(): boolean {
        let hasLevelChange = false
        if (!this.room.memory.stats) this.room.memory.stats = {}

        // 统计升级进度
        this.room.memory.stats.controllerRatio = (this.progress / this.progressTotal) * 100

        // 统计房间等级
        if (this.room.memory.stats.controllerLevel !== this.level) hasLevelChange = true
        this.room.memory.stats.controllerLevel = this.level

        return hasLevelChange
    }

    /**
     * 维持房间运营的 creep 规划
     */
    private planCreep(): void {
        // console.log('creep 规划运行！等级', this.level)

        switch (this.level) {
            // 添加最基本的 creep
            case 1:
                this.room.planCreep()
            break
        }
    }

    /**
     * 检查本房间中的禁止通行点位
     * 如果有的点位上没有 creep 的话则移除该点位
     * 防止出现有的 creep 没有及时释放导致的永久性禁止通行
     */
    private checkRestrictedPos(): void {
        const restrictedPos = this.room.getRestrictedPos()

        // 遍历本房间所有的禁止通行点位
        for (const creepName in restrictedPos) {
            const pos = this.room.unserializePos(restrictedPos[creepName])
            // 如果位置上没有 creep 就说明是无效点位，直接移除
            if (pos.lookFor(LOOK_CREEPS).length > 0) delete this.room.memory.restrictedPos[creepName]
        }
    }
}

// nuker 拓展
class NukerExtension extends StructureNuker {
    public work(): void {
        this.stateScanner()
        // 注册自己的 id 来让房间基础服务可以发现自己
        if (!this.room.memory.nukerId) this.room.memory.nukerId = this.id

        if (Game.time % 30) return

        // G 矿不满并且 terminal 中 G 矿大于 1k 则开始填充 G
        if (this.store[RESOURCE_GHODIUM] < NUKER_GHODIUM_CAPACITY && this.room.terminal && this.room.terminal.store[RESOURCE_GHODIUM] >= 1000) {
            this.room.addRoomTransferTask({
                type: ROOM_TRANSFER_TASK.FILL_NUKER,
                id: this.id,
                resourceType: RESOURCE_GHODIUM
            })

            return
        }
        // 能量不满并且 storage 能量大于 300k 则开始填充能量
        if (this.store[RESOURCE_ENERGY] < NUKER_ENERGY_CAPACITY && this.room.storage && this.room.storage.store[RESOURCE_ENERGY] >= 300000) {
            this.room.addRoomTransferTask({
                type: ROOM_TRANSFER_TASK.FILL_NUKER,
                id: this.id,
                resourceType: RESOURCE_ENERGY
            })

            return
        }
    }

    /**
     * 统计自己存储中的资源数量
     */
    private stateScanner(): void {
        if (Game.time % stateScanInterval) return
        if (!this.room.memory.stats) this.room.memory.stats = {}

        this.room.memory.stats.nukerEnergy = this.store[RESOURCE_ENERGY]
        this.room.memory.stats.nukerG = this.store[RESOURCE_GHODIUM]
        this.room.memory.stats.nukerCooldown = this.cooldown
    }
}

/**
 * PowerSpawn 拓展
 * ps 的主要任务就是 processPower，一旦 ps 建立完成，他会每隔一段时间对自己存储进行检查
 * 一旦发现自己资源不足，就会发起向自己运输资源的物流任务。
 * 
 * 可以随时通过房间上的指定方法来暂停/重启 ps，详见 Room.help()
 */
class PowerSpawnExtension extends StructurePowerSpawn {
    public work(): void {
        if (Game.time % powerSettings.processInterval) return
        // 注册自己的 id 来让房间基础服务可以发现自己
        if (!this.room.memory.powerSpawnId) this.room.memory.powerSpawnId = this.id
        // 兜底
        if (!this.room.memory.powerSpawn) this.room.memory.powerSpawn = {}
        if (this.room.memory.powerSpawn.pause) return

        // 处理 power
        this.processPower()

        // powerSpawn 内 power 不足且 terminal 内 energy 充足
        if (this.store[RESOURCE_POWER] < 10 && this.room.terminal && this.room.terminal.store.getUsedCapacity(RESOURCE_POWER) > 0) {
            this.room.addRoomTransferTask({
                type: ROOM_TRANSFER_TASK.FILL_POWERSPAWN,
                id: this.id,
                resourceType: RESOURCE_POWER
            })

            return
        }

        // powerSpawn 内 energy 不足且 storage 内 energy 充足
        if (this.store[RESOURCE_ENERGY] < 1000 && this.room.storage && this.room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > powerSettings.processEnergyLimit) {
            this.room.addRoomTransferTask({
                type: ROOM_TRANSFER_TASK.FILL_POWERSPAWN,
                id: this.id,
                resourceType: RESOURCE_ENERGY
            })

            return
        }
    }
}

/**
 * Observer 拓展
 * 定期搜索给定列表中的房间并插旗
 */
class ObserverExtension extends StructureObserver {
    public work(): void {
        if (!this.room.memory.observerId) this.room.memory.observerId = this.id
        // 没有初始化或者暂停了就不执行工作
        if (!this.room.memory.observer) return
        if (this.room.memory.observer.pause) return
        // 都找到了就不继续工作了
        if ((this.getFlagName('deposit') in Game.flags) && (this.getFlagName('powerBank') in Game.flags)) return

        // 如果房间没有视野就获取视野，否则就执行搜索
        if (this.room.memory.observer.checkRoomName) this.searchRoom()
        else this.obRoom()
    }

    /**
     * 在房间内执行搜索
     * 该方法会搜索房间中的 deposits 和 power bank，一旦发现自动插旗
     */
    private searchRoom(): void {
        // 从内存中获取要搜索的房间
        const room = Game.rooms[this.room.memory.observer.checkRoomName]
        // 兜底
        if (!room) {
            delete this.room.memory.observer.checkRoomName
            return
        }

        // 还没插旗的话就继续查找 deposit
        const depositFlagName = this.getFlagName('deposit')
        if (!(depositFlagName in Game.flags)) {
            const deposits = room.find(FIND_DEPOSITS)
            // 对找到的 deposit 进行处置归档
            deposits.forEach(deposit => {
                // 冷却过长或者已经插旗的忽略
                if (deposit.lastCooldown >= DEPOSIT_MAX_COOLDOWN) return
                const flags = deposit.pos.lookFor(LOOK_FLAGS)
                if (flags.length > 0) return
                
                // 确认完成，插旗
                room.createFlag(deposit.pos, depositFlagName)
                console.log(`[${this.room.name} Observer] ${this.room.memory.observer.checkRoomName} 检测到新 deposit, 已插旗`)
            })
        }
        
        // 还没插旗的话就继续查找 pb
        const powerBankFlagName = this.getFlagName('powerBank')
        if (!(powerBankFlagName in Game.flags)) {
            // pb 的存活时间大于 3000 / power 足够大的才去采集
            const powerBanks = room.find(FIND_STRUCTURES, {
                filter: s => s.structureType == STRUCTURE_POWER_BANK && s.ticksToDecay >= 3000 && (s as StructurePowerBank).power >= 2000
            })
            // 对找到的 pb 进行处置归档
            powerBanks.forEach(powerBank => {
                const flags = powerBank.pos.lookFor(LOOK_FLAGS)
                if (flags.length > 0) return
    
                // 确认完成，插旗
                room.createFlag(powerBank.pos, powerBankFlagName)
                console.log(`[${this.room.name} Observer] ${this.room.memory.observer.checkRoomName} 检测到新 pb, 已插旗`)    
            })
        }

        // 确认该房间已被搜索
        delete this.room.memory.observer.checkRoomName
    }

    /**
     * 获取旗帜名称
     * 名字形如：powerbank W1N1
     * 
     * @param resourceType 资源类型
     */
    private getFlagName(resourceType: ObserverResource): string {
        return `${resourceType} ${this.room.name}`
    }

    /**
     * 获取指定房间视野
     */
    private obRoom(): void {
        if (Game.time % observerInterval) return

        // 执行视野获取
        const roomName = this.room.memory.observer.watchRooms[this.room.memory.observer.watchIndex]
        const obResult = this.observeRoom(roomName)

        // 标志该房间视野已经获取，可以进行检查
        if (obResult === OK) this.room.memory.observer.checkRoomName = roomName

        // 设置下一个要查找房间的索引
        this.room.memory.observer.watchIndex = this.room.memory.observer.watchIndex < (this.room.memory.observer.watchRooms.length - 1) ?
            this.room.memory.observer.watchIndex + 1 : 0
    }

    /**
     * 【废弃】将新资源录入存档
     * 
     * @param resourceType 新发现的资源类型
     * @param flagName 已经插好的旗帜名称
     */
    private addResource(resourceType: ObserverResource, flagName: string): void {
        if (resourceType in this.room.memory.observer.resourceFlags) {
            this.room.memory.observer.resourceFlags[resourceType].push(flagName)
        }
    }

    /**
     * 【废弃】查询 observer 发现的资源
     * 暂时只支持返回首个资源
     * 
     * @param resourceType 要查询的资源类型
     */
    public getResource(resourceType: ObserverResource): string | undefined {
        if (!this.room.memory.observer) return undefined

        return this.room.memory.observer.resourceFlags[resourceType][0]
    }

    /**
     * 【废弃】完成指定旗帜下的资源采集
     * 
     * @param resourceType 要移除的资源类型
     * @param flagName 完成采集的旗帜名称
     */
    public clearResource(resourceType: ObserverResource, flagName: string): void {
        if (!this.room.memory.observer) return 

        this.room.memory.observer.resourceFlags[resourceType] = _.uniq(this.room.memory.observer.resourceFlags[resourceType], [ flagName ])
    }

    /**
     * 初始化 observer
     */
    private init(): void {
        this.room.memory.observer = {
            watchIndex: 0,
            watchRooms: [],
            resourceFlags: { powerBank: [], deposit: [] }
        }
    }

    /**
     * 用户操作：新增监听房间
     * 
     * @param roomNames 要进行监听的房间名称
     */
    public add(...roomNames: string[]): string {
        if (!this.room.memory.observer) this.init()

        // 确保新增的房间名不会重复
        this.room.memory.observer.watchRooms = _.uniq([ ...this.room.memory.observer.watchRooms, ...roomNames])

        return `[${this.room.name} observer] 已添加，${this.show(true)}`
    }

    /**
     * 用户操作：移除监听房间
     * 
     * @param roomNames 不在监听的房间名
     */
    public remove(...roomNames: string[]): string {
        if (!this.room.memory.observer) this.init()

        // 移除指定房间
        this.room.memory.observer.watchRooms = _.difference(this.room.memory.observer.watchRooms, roomNames)
        
        return `[${this.room.name} observer] 已移除，${this.show(true)}`
    }

    /**
     * 用户操作：暂停 observer
     */
    public off(): string {
        if (!this.room.memory.observer) return `[${this.room.name} observer] 未启用`

        this.room.memory.observer.pause = true

        return `[${this.room.name} observer] 已暂停`
    }

    /**
     * 用户操作：重启 observer
     */
    public on(): string {
        if (!this.room.memory.observer) return `[${this.room.name} observer] 未启用`

        delete this.room.memory.observer.pause

        return `[${this.room.name} observer] 已恢复, ${this.show(true)}`
    }

    /**
     * 用户操作：清空房间列表
     */
    public clear(): string {
        if (!this.room.memory.observer) this.init()

        this.room.memory.observer.watchRooms = []

        return `[${this.room.name} observer] 已清空监听房间`
    }

    /**
     * 用户操作：显示当前监听的房间列表
     * 
     * @param noTitle 该参数为 true 则不显示前缀
     */
    public show(noTitle: boolean = false): string {
        let result = noTitle ? '' : `[${this.room.name} observer] `

        result += this.room.memory.observer ? 
        `监听中的房间列表为: ${this.room.memory.observer.watchRooms}` :
        `未启用`

        return result
    }

    /**
     * 用户操作- 帮助
     */
    public help(): string {
        return createHelp([
            {
                title: '新增监听房间',
                params: [
                    { name: '...roomNames', desc: '要监听的房间名列表' }
                ],
                functionName: 'add'
            },
            {
                title: '移除监听房间',
                params: [
                    { name: '...roomNames', desc: '要移除的房间名列表' }
                ],
                functionName: 'remove'
            },
            {
                title: '显示所有监听房间',
                functionName: 'show'
            },
            {
                title: '移除所有监听房间',
                functionName: 'clear'
            },
            {
                title: '暂停工作',
                functionName: 'off'
            },
            {
                title: '重启工作',
                functionName: 'on'
            }
        ])
    }
}
