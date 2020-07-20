import roles from './role'
import { creepApi } from './creepController'
import { clearStructure } from './autoPlanning'
import { createHelp, colorful, whiteListFilter } from './utils'
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
    // observer 相关
    observerInterval,
    DEPOSIT_MAX_COOLDOWN,
    // 挂载内存相关
    structureWithMemory,
    minerHervesteLimit
} from './setting'

import LabExtension from './mount.lab'
import FactoryExtension from './mount.factory'
import TerminalExtension from './mount.terminal'

// 挂载拓展到建筑原型
export default function () {
    mountMemory()

    // 拓展到原型的对应关系
    const assignMap = [
        [ Structure, StructureExtension ],
        [ StructureController, ControllerExtension ],
        [ StructureSpawn, SpawnExtension ],
        [ StructureTower, TowerExtension ],
        [ StructureLink, LinkExtension ],
        [ StructureFactory, FactoryExtension ],
        [ StructureTerminal, TerminalExtension ],
        [ StructureExtractor, ExtractorExtension ],
        [ StructureStorage, StorageExtension ],
        [ StructureLab, LabExtension ],
        [ StructureNuker, NukerExtension ],
        [ StructurePowerSpawn, PowerSpawnExtension ],
        [ StructureObserver, ObserverExtension ]
    ]

    // 挂载所有拓展
    assignMap.forEach(protos => _.assign(protos[0].prototype, protos[1].prototype))
}

/**
 * 给指定建筑挂载内存【暂未使用】
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

class StructureExtension extends Structure {
    // 建筑通用的日志方法
    log(content:string, color: Colors | undefined = undefined, notify: boolean = false): void {
        this.room.log(content, this.structureType, color, notify)
    }
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
             * 而 creep 恰好就是在这段时间里执行的物流任务，就会出现如下错误逻辑：
             * mySpawnCreep 返回 OK > 推送填充任务 > creep 执行任务 > 发现能量都是满的 > **移除任务** > tick 末期开始孵化 > extension 扣除能量
             */
            if (this.spawning.needTime - this.spawning.remainingTime == 1) {
                this.room.addRoomTransferTask({ type: ROOM_TRANSFER_TASK.FILL_EXTENSION }, 1)
                
                if (
                    // 非战争状态下直接发布 power 填 extension 任务
                    !this.room.memory.war ||
                    // 战争模式时，剩余能量掉至 50% 以下再发布 power 任务，防止 power 效果被浪费
                    (this.room.energyAvailable / this.room.energyCapacityAvailable <= 0.5)
                ) this.room.addPowerTask(PWR_OPERATE_EXTENSION, 1)
            }
            return
        }
        if (!this.room.memory.spawnList) this.room.memory.spawnList = []
        // 生成中共 / 生产队列为空 就啥都不干
        if (this.spawning || this.room.memory.spawnList.length == 0) return 
        // 进行生成
        const spawnResult: MySpawnReturnCode = this.mySpawnCreep(this.room.memory.spawnList[0])

        // 生成成功后移除任务
        if (spawnResult === OK) this.room.memory.spawnList.shift()
        // 能量不足就挂起任务
        else if (spawnResult === ERR_NOT_ENOUGH_ENERGY) this.room.hangSpawnTask()
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

        // 设置 creep 内存
        let creepMemory: CreepMemory = _.cloneDeep(creepDefaultMemory)
        creepMemory.role = creepConfig.role
        creepMemory.data = creepConfig.data

        // 获取身体部件, 优先使用 bodys
        const bodys = (typeof creepWork.bodys === 'string') ? this.getBodys(creepConfig.bodys as string) : creepConfig.bodys as BodyPartConstant[]
        if (bodys.length <= 0) return ERR_NOT_ENOUGH_ENERGY
        
        const spawnResult: ScreepsReturnCode = this.spawnCreep(bodys, configName, {
            memory: creepMemory
        })
        // 检查是否生成成功
        if (spawnResult == OK) {
            // this.log(`正在生成 ${configName} ...`)
            return OK
        }
        else if (spawnResult == ERR_NAME_EXISTS) {
            this.log(`${configName} 已经存在 ${creepConfig.spawnRoom} 将不再生成 ...`)
            return OK
        }
        else {
            // this.log(`生成失败, ${creepConfig.spawnRoom} 任务 ${configName} 挂起, 错误码 ${spawnResult}`, 'red')
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
            // 根据当前状态执行对应的逻辑
            switch (this.room.memory.defenseMode) {
                case 'defense': // 普通防御模式
                    this.defenseWork()
                break
                case 'active': // 主动防御模式
                    this.activeWork()
                break
                default: // 日常模式
                case undefined: 
                    this.dailyWork()
                break
            }
        }
    }

    /**
     * 日常的 tower 工作
     */
    private dailyWork(): void {
        // 先攻击敌人
        if (this.dailyAlert()) { }
        // 找不到敌人再维修建筑
        else if (this.commandRepair()) { }
        // 找不到要维修的建筑就刷墙
        else if (this.commandFillWall()) { }
    }

    /**
     * 遇到敌人且敌人不足以启动主动模式时的防御工作
     */
    private defenseWork(): void {
        const enemys = this.findEnemy()

        // 没有敌人了就返回日常模式
        if (enemys.length <= 0){
            // this.log('威胁解除，返回日常模式')
            delete this.room.memory.defenseMode
            return
        }

        this.fire(enemys)
        if (this.room.controller.checkEnemyThreat()) {
            // 启动主动防御模式
            this.room.memory.defenseMode = 'active'
            // this.log('已启动主动防御')
        }
    }

    /**
     * 主动防御模式 tower 工作
     */
    private activeWork(): void {
        const defenderName = `${this.room.name} defender`
        const defender = Game.creeps[defenderName]

        if (defender && !defender.spawning) {
            // 有防御单位并且掉血了就进行治疗
            if (defender.hits < defender.hitsMax) {
                this.heal(defender)
            }
            // 没掉血就攻击敌人
            else {
                const enemys = this.findEnemy()
                this.fire(enemys)
            }
        }
        else {
            // 没有防御单位的情况下当能量大于 700 才攻击敌方单位，省下能量来之后治疗防御单位
            if (this.store[RESOURCE_ENERGY] > 700) {
                const enemys = this.findEnemy()
                this.fire(enemys)
            }

            // 没有防御单位时才准备 boost
            this.prepareBoost(defenderName)
        }

        this.wallCheck()
        this.requireEnergy(700)
    }

    /**
     * 准备主动防御需要的 boost 并发布防御单位
     * 
     * @param defenderName 要发布的防御单位名称
     */
    private prepareBoost(defenderName: string): void {
        if (!this.room.memory.boost) {
            this.log('正在准备 boost 主动防御')
            const result = this.room.startWar('DEFENSE')

            if (result === ERR_NOT_FOUND) this.log(`未找到名为 [${this.room.name}Boost] 的旗帜，请保证其周围有足够数量的 lab（至少 5 个）`, 'yellow')
            else if (result === ERR_INVALID_TARGET) this.log('旗帜周围的 lab 数量不足，请移动旗帜位置', 'yellow')

            return
        }

        // 已经有主动防御任务了
        if (this.room.memory.boost.type === 'DEFENSE') {
            // 强化准备完成，发布防御单位
            if (this.room.memory.boost.state === 'waitBoost' && !creepApi.has(defenderName)) {
                const result = creepApi.add(defenderName, 'defender', {}, this.room.name)
                this.log(`已发布主动防御单位，返回值：${result}`, 'green')
            }
        }
        // 房间处于其他 boost 任务时结束其任务并切换至主动防御 boost 任务
        else if (this.room.memory.boost.state !== 'boostClear') {
            this.log(`当前正处于战争状态，正在切换至主动防御模式，请稍后...`)
            this.room.stopWar()
        }
    }

    /**
     * 墙壁检查
     * 受到攻击就孵化修墙工
     * 有墙壁被摧毁就进入安全模式
     */
    private wallCheck(): void {
        const logs = this.room.getEventLog()
        
        for (const log of logs) {
            // 墙壁或 ram 被摧毁
            if (log.event === EVENT_OBJECT_DESTROYED) {
                // 不是墙体被摧毁就继续检查 log
                if (!log.data || (log.data.type != STRUCTURE_RAMPART && log.data.type != STRUCTURE_WALL)) continue
                // 有墙体被摧毁，直接启动安全模式
                this.room.controller.activateSafeMode()
                const enemyUsername = _.uniq(this.room._enemys.map(creep => creep.owner.username)).join(', ')
                Game.notify(`[${this.room.name}] 墙壁被击破，已启动安全模式 [Game.ticks] ${Game.time} [敌人] ${enemyUsername}`)

                break
            }
            // 墙壁被攻击
            else if (log.event === EVENT_ATTACK) {
                const target = Game.getObjectById<Structure>(log.data.targetId)
                if (!target) continue

                if (target instanceof StructureRampart || target instanceof StructureWall) {
                    // 设为焦点墙体
                    this.room._importantWall = target
                    
                    const repairCreepName = `${this.room.name} repair`
                    if (creepApi.has(`${repairCreepName} 1`)) break

                    this.log(`墙体被攻击!孵化维修单位`, 'yellow')
                    // 小于七级的话无法生成 defender，所以会孵化更多的 repairer
                    const repairerList = this.room.controller.level >= 7 ? [1, 2, 3] : [1, 2, 3, 4, 5, 6, 7, 8]
                    // 如果没有维修者的话就进行发布
                    repairerList.forEach(index => {
                        creepApi.add(`${repairCreepName} ${index}`, 'repairer', {
                            sourceId: this.room.storage ? this.room.storage.id : '',
                        }, this.room.name)
                    })
                }
            }
        }
    }

    /**
     * 日常警戒
     * 间隔搜索一次，检查本房间是否有敌人，有的话则攻击并切入防御模式
     * 
     * @returns 有敌人返回 true，没敌人返回 false
     */
    private dailyAlert(): boolean {
        const enemys = this.findEnemy(5)
        if (enemys.length <= 0) return false

        // 发现敌人则攻击并设置状态为普通防御
        this.fire(enemys)
        this.room.memory.defenseMode = 'defense'
        // this.log(`已启动防御模式`)
        return true
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
            this.requireEnergy(600)
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
        this.requireEnergy(600)

        // 标记一下防止其他 tower 继续刷墙
        this.room._hasFillWall = true
        return true
    }

    /**
     * 搜索敌人
     * 
     * @param searchInterval 搜索间隔，每隔多久进行一次搜索
     */
    private findEnemy(searchInterval: number = 1): (Creep|PowerCreep)[] {
        if (Game.time % searchInterval) return []
        // 有其他 tower 搜索好的缓存就直接返回
        if (this.room._enemys) return this.room._enemys

        // 搜索白名单之外的玩家
        this.room._enemys = this.room.find(FIND_HOSTILE_CREEPS, {
            filter: whiteListFilter 
        })
        if (this.room._enemys.length <= 0) this.room._enemys = this.room.find(FIND_HOSTILE_POWER_CREEPS, {
            filter: whiteListFilter
        })

        return this.room._enemys
    }

    /**
     * 选择目标并开火
     * 
     * @param enemys 目标合集
     */
    private fire(enemys: (Creep|PowerCreep)[]): ScreepsReturnCode {
        if (enemys.length <= 0) return ERR_NOT_FOUND

        return this.attack(this.pos.findClosestByRange(enemys))
    }

    /**
     * 请求能量
     * 
     * @param lowerLimit 能量下限，当自己能量低于该值时将发起请求
     */
    private requireEnergy(lowerLimit: number = 900): void {
        if (this.store[RESOURCE_ENERGY] <= lowerLimit) {
            this.room.addRoomTransferTask({ type: ROOM_TRANSFER_TASK.FILL_TOWER, id: this.id })
        }
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

        // 检查内存字段来决定要执行哪种职责的工作
        if (this.room.memory.centerLinkId && this.room.memory.centerLinkId === this.id) this.centerWork()
        else if (this.room.memory.upgradeLinkId && this.room.memory.upgradeLinkId === this.id) { }
        else this.sourceWork()
    }

    /**
     * 回调 - 建造完成
     * 分配默认职责
     */
    public onBuildComplete(): void {
        // 如果附近有 Source 就转换为 SourceLink
        const inRangeSources = this.pos.findInRange(FIND_SOURCES, 2)
        if (inRangeSources.length > 0) {
            this.asSource()
            return
        }

        // 在基地中心附近就转换为 CenterLink
        const center = this.room.memory.center
        if (center && this.pos.isNearTo(new RoomPosition(center[0], center[1], this.room.name))) {
            this.asCenter()
            return
        }

        // 否则就默认转换为 UpgraderLink
        this.asUpgrade()
    }

    /**
     * 注册为源 link
     */
    public asSource(): string {
        this.clearRegister()

        // 更新 harvester
        this.room.releaseCreep('harvester')

        return `${this} 已注册为源 link，已重定向对应 harvester 的存放目标`
    }

    /**
     * 注册为中央 link
     */
    public asCenter(): string {
        this.clearRegister()
        this.room.memory.centerLinkId = this.id

        // 注册中央 link 的同时发布 processor
        this.room.releaseCreep('processor')
        this.room.releaseCreep('harvester')

        return `${this} 已注册为中央 link，发布 processor 并调整采集单位`
    }

    /**
     * 注册为升级 link
     * 
     * 自己被动的给 upgrader 角色提供能量，所以啥也不做
     * 只是在房间内存里注册来方便其他 link 找到自己
     */
    public asUpgrade(): string {
        this.clearRegister()

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
    }

    /**
     * 扮演中央 link
     * 
     * 能量快满时向房间中的资源转移队列推送任务
     */
    private centerWork(): void {
        // 能量为空则待机
        if (<number>this.store.getUsedCapacity(RESOURCE_ENERGY) == 0) return
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
        if (<number>this.store.getUsedCapacity(RESOURCE_ENERGY) < 700) return
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
        // 如果 mineral 冷却好了并且 terminal 还有空间就重新发布 miner
        if (Game.time > this.room.memory.mineralCooldown) {
            if (this.room.terminal && this.room.terminal.store.getUsedCapacity() < minerHervesteLimit) {
                delete this.room.memory.mineralCooldown

                creepApi.add(`${this.room.name} miner`, 'miner', {
                    sourceId: this.room.mineral.id,
                    targetId: this.room.terminal ? this.room.terminal.id : this.room.storage.id
                }, this.room.name)
            }
            else this.room.memory.mineralCooldown = Game.time + 10000
        }
    }

    /**
     * 更新 mineral id
     */
    public onBuildComplete(): void {
        this.room.memory.extractorId = this.id

        // 如果终端造好了就发布矿工
        if (this.room.terminal) this.room.releaseCreep('miner')
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
        // 定时运行规划
        this.room.releaseCreep('upgrader')
        // 能量太多就提供资源共享
        if (this.store[RESOURCE_ENERGY] >= ENERGY_SHARE_LIMIT) this.room.shareAddSource(RESOURCE_ENERGY)
    }

    /**
     * 统计自己存储中的剩余能量
     */
    private stateScanner(): void {
        if (Game.time % 20) return
        if (!Memory.stats.rooms[this.room.name]) Memory.stats.rooms[this.room.name] = {}

        Memory.stats.rooms[this.room.name].energy = this.store[RESOURCE_ENERGY]
    }

    /**
     * 建筑完成时以自己为中心发布新的 creep 运维组
     */
    public onBuildComplete(): void {
        this.room.releaseCreep('harvester')
        this.room.releaseCreep('manager')
        this.room.releaseCreep('upgrader')
    }
}

/**
 * Controller 拓展
 * 统计当前升级进度、移除无效的禁止通行点位
 */
class ControllerExtension extends StructureController {
    public work(): void {
        if (Game.time % 20) return

        // 如果等级发生变化了就运行 creep 规划
        if (this.stateScanner()) this.onLevelChange(this.level)

        // 8 级并且快掉级了就孵化 upgrader
        if (this.level === 8 && this.ticksToDowngrade <= 100000) creepApi.add(`${this.room.name} upgrader1`, 'upgrader', {
            sourceId: this.room.storage.id
        }, this.room.name)

        // 检查外矿有没有被入侵的，有的话是不是可以重新发布 creep 了
        if (this.room.memory.remote) {
            for (const remoteRoomName in this.room.memory.remote) {
                // 如果发现入侵者已经老死了，就移除对应属性并重新发布外矿角色组
                if (this.room.memory.remote[remoteRoomName].disableTill <= Game.time) {
                    delete this.room.memory.remote[remoteRoomName].disableTill
                    this.room.addRemoteCreepGroup(remoteRoomName)
                }
            }
        }
    }

    /**
     * 当等级发生变化时的回调函数
     * 
     * @param level 当前的等级
     */
    public onLevelChange(level: number): void {
        // 规划布局
        this.log(this.room.planLayout())

        // 刚占领，移除不必要的建筑并添加最基础的角色组
        if (level === 1) {
            const result = clearStructure(this.room)
            if (result === OK) this.log(`已清理过期建筑，你可以选择执行 Game.rooms.${this.room.name}.clearWall() 来清理现存的墙壁`, 'green')

            this.room.releaseCreep('harvester')
            this.room.releaseCreep('upgrader')
        }
    }

    /**
     * 统计自己的等级信息
     * 
     * @returns 为 true 时说明自己等级发生了变化
     */
    private stateScanner(): boolean {
        let hasLevelChange = false
        if (!Memory.stats.rooms[this.room.name]) Memory.stats.rooms[this.room.name] = {}

        // 统计升级进度
        Memory.stats.rooms[this.room.name].controllerRatio = (this.progress / this.progressTotal) * 100

        // 统计房间等级
        if (Memory.stats.rooms[this.room.name].controllerLevel !== this.level) hasLevelChange = true
        Memory.stats.rooms[this.room.name].controllerLevel = this.level

        return hasLevelChange
    }

    /**
     * 检查敌人威胁
     * 检查房间内所有敌人的身体部件情况确认是否可以造成威胁
     * 
     * @returns 是否可以造成威胁（是否启用主动防御模式）
     */
    public checkEnemyThreat(): boolean {
        // 这里并没有搜索 PC，因为 PC 不是敌人主力
        const enemy = this.room._enemys || this.room.find(FIND_HOSTILE_CREEPS, {
            filter: whiteListFilter
        })
        if (enemy.length <= 0) return false

        // 如果来的都是入侵者的话，就算撑破天了也不管
        if (!enemy.find(creep => creep.owner.username !== 'Invader')) return false

        const bodyNum = enemy.map(creep => {
            // 如果是 creep 则返回身体部件，如果不是则不参与验证
            return creep instanceof Creep ? creep.body.length : 0
        }).reduce((pre, cur) => pre + cur)
        // 满配 creep 数量大于 1，就启动主动防御
        return bodyNum > MAX_CREEP_SIZE
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

        if (Game.time % 30) return

        // G 矿不满并且 terminal 中有 G 矿则开始填充 G
        if (!this.keepResource(RESOURCE_GHODIUM, NUKER_GHODIUM_CAPACITY, this.room.terminal, 0)) return 
        // 能量不满并且 storage 能量大于 300k 则开始填充能量
        if (!this.keepResource(RESOURCE_ENERGY, NUKER_ENERGY_CAPACITY, this.room.storage, 300000)) return
    }

    // 在房间基础服务中注册自己
    public onBuildComplete(): void {
        this.room.memory.nukerId = this.id
    }

    /**
     * 将自身存储的资源维持在指定容量之上
     * 
     * @param resource 要检查的资源
     * @param amount 当资源余量少于该值时会发布搬运任务
     * @param source 资源不足时从哪里获取资源
     * @param sourceLimit 资源来源建筑中剩余目标资源最小值（低于该值将不会发布资源获取任务）
     * @returns 该资源是否足够
     */
    private keepResource(resource: ResourceConstant, amount: number, source: StructureStorage | StructureTerminal, sourceLimit: number): boolean {
        if (this.store[resource] >= amount) return true

        // 检查来源是否符合规则，符合则发布资源转移任务
        if (source && source.store.getUsedCapacity(resource) > sourceLimit) {
            this.room.addRoomTransferTask({
                type: ROOM_TRANSFER_TASK.FILL_NUKER,
                id: this.id,
                resourceType: resource
            })    
        }

        return false
    }

    /**
     * 统计自己存储中的资源数量
     */
    private stateScanner(): void {
        if (Game.time % 20) return
        if (!Memory.stats.rooms[this.room.name]) Memory.stats.rooms[this.room.name] = {}

        Memory.stats.rooms[this.room.name].nukerEnergy = this.store[RESOURCE_ENERGY]
        Memory.stats.rooms[this.room.name].nukerG = this.store[RESOURCE_GHODIUM]
        Memory.stats.rooms[this.room.name].nukerCooldown = this.cooldown
    }
}

/**
 * PowerSpawn 拓展
 * ps 的主要任务就是 processPower，一旦 ps 启动之后，他会每隔一段时间对自己存储进行检查
 * 发现自己资源不足，就会发起向自己运输资源的物流任务。
 * 
 * 可以随时通过原型上的指定方法来暂停/重启 ps，详见 .help()
 */
class PowerSpawnExtension extends StructurePowerSpawn {
    public work(): void {
        // ps 未启用或者被暂停了就跳过
        if (this.room.memory.pausePS) return

        // 处理 power
        this.processPower()

        // 剩余 power 不足且 terminal 内 power 充足
        if (!this.keepResource(RESOURCE_POWER, 10, this.room.terminal, 0)) return
        // 剩余energy 不足且 storage 内 energy 充足
        if (!this.keepResource(RESOURCE_ENERGY, 1000, this.room.storage, powerSettings.processEnergyLimit)) return
    }

    /**
     * 将自身存储的资源维持在指定容量之上
     * 
     * @param resource 要检查的资源
     * @param amount 当资源余量少于该值时会发布搬运任务
     * @param source 资源不足时从哪里获取资源
     * @param sourceLimit 资源来源建筑中剩余目标资源最小值（低于该值将不会发布资源获取任务）
     * @returns 该资源是否足够
     */
    private keepResource(resource: ResourceConstant, amount: number, source: StructureStorage | StructureTerminal, sourceLimit: number): boolean {
        if (this.store[resource] >= amount) return true

        // 检查来源是否符合规则，符合则发布资源转移任务
        if (source && source.store.getUsedCapacity(resource) > sourceLimit) {
            this.room.addRoomTransferTask({
                type: ROOM_TRANSFER_TASK.FILL_POWERSPAWN,
                id: this.id,
                resourceType: resource
            })    
        }

        return false
    }

    // 建造完成时注册自己的 id 到房间
    public onBuildComplete(): void {
        this.room.memory.powerSpawnId = this.id
    }

    /**
     * 用户操作 - 启动 powerSpawn
     */
    public on(): string {
        delete this.room.memory.pausePS

        // 把自己注册到全局的启用 ps 列表
        if (!Memory.psRooms) Memory.psRooms = []
        Memory.psRooms = _.uniq([ ...Memory.psRooms, this.room.name])

        return `[${this.room.name} PowerSpawn] 已启动 process power`
    }

    /**
     * 用户操作 - 关闭 powerSpawn
     */
    public off(): string {
        this.room.memory.pausePS = true
        
        // 把自己从全局启用 ps 列表中移除
        if (Memory.psRooms) {
            Memory.psRooms = _.difference(Memory.psRooms, [ this.room.name ])
            if (Memory.psRooms.length <= 0) delete Memory.psRooms
        }

        return `[${this.room.name} PowerSpawn] 已暂停 process power`
    }

    /**
     * 用户操作 - 查看 ps 运行状态
     */
    public stats(): string {
        let roomsStats: string[] = []
        // 生成状态
        const working = this.store[RESOURCE_POWER] > 1 && this.store[RESOURCE_ENERGY] > 50
        const stats = working ? colorful('工作中', 'green') : colorful('等待资源中', 'red')
        // 统计 powerSpawn、storage、terminal 的状态
        roomsStats.push(`[${this.room.name}] ${stats} POWER: ${this.store[RESOURCE_POWER]}/${POWER_SPAWN_POWER_CAPACITY} ENERGY: ${this.store[RESOURCE_ENERGY]}/${POWER_SPAWN_ENERGY_CAPACITY}`)
        roomsStats.push(this.room.storage ? `Storage energy: ${this.room.storage.store[RESOURCE_ENERGY]}` : `Storage X`)
        roomsStats.push(this.room.terminal ? `Terminal power: ${this.room.terminal.store[RESOURCE_POWER]}` : `Terminal X`)

        return roomsStats.join(' || ')
    }

    /**
     * 用户操作 - 帮助信息
     */
    public help(): string {
        return createHelp([
            {
                title: '启动/恢复处理 power',
                functionName: 'on'
            },
            {
                title: '暂停处理 power',
                functionName: 'off'
            },
            {
                title: '查看当前状态',
                functionName: 'stats'
            }
        ])
    }
}

/**
 * Observer 拓展
 * 定期搜索给定列表中的房间并插旗
 */
class ObserverExtension extends StructureObserver {
    public work(): void {
        const memory = this.room.memory.observer
        // 没有初始化或者暂停了就不执行工作
        if (!memory) return
        if (memory.pause) return
        // 都找到上限就不继续工作了
        if ((memory.pbNumber >= memory.pbMax) && (memory.depositNumber >= memory.depositMax)) return

        // 如果房间没有视野就获取视野，否则就执行搜索
        if (this.room.memory.observer.checkRoomName) this.searchRoom()
        else this.obRoom()
    }

    public onBuildComplete(): void {
        this.room.memory.observerId = this.id
    }

    /**
     * 在房间内执行搜索
     * 该方法会搜索房间中的 deposits 和 power bank，一旦发现自动插旗
     */
    private searchRoom(): void {
        // 从内存中获取要搜索的房间
        const memory = this.room.memory.observer
        const room = Game.rooms[memory.checkRoomName]
        // 兜底
        if (!room) {
            delete this.room.memory.observer.checkRoomName
            return
        }
        // this.log(`搜索房间 ${room.name}`)

        // 还没插旗的话就继续查找 deposit
        if (memory.depositNumber < memory.depositMax) {
            const deposits = room.find(FIND_DEPOSITS)
            // 对找到的 deposit 进行处置归档
            deposits.forEach(deposit => {
                // 冷却过长或者已经插旗的忽略
                if (deposit.lastCooldown >= DEPOSIT_MAX_COOLDOWN) return
                const flags = deposit.pos.lookFor(LOOK_FLAGS)
                if (flags.length > 0) return
                
                // 确认完成，插旗
                this.newHarvesteTask(deposit)
                this.log(`${this.room.memory.observer.checkRoomName} 检测到新 deposit, 已插旗`, 'green')
            })
        }
        
        // 还没插旗的话就继续查找 pb
        if (memory.pbNumber < memory.pbMax) {
            // pb 的存活时间大于 3000 / power 足够大的才去采集
            const powerBanks = room.find<StructurePowerBank>(FIND_STRUCTURES, {
                filter: s => s.structureType == STRUCTURE_POWER_BANK && s.ticksToDecay >= 3000 && (s as StructurePowerBank).power >= 2000
            })
            // 对找到的 pb 进行处置归档
            powerBanks.forEach(powerBank => {
                const flags = powerBank.pos.lookFor(LOOK_FLAGS)
                if (flags.length > 0) return
    
                // 确认完成，插旗
                this.newHarvesteTask(powerBank)
                this.log(`${this.room.memory.observer.checkRoomName} 检测到新 pb, 已插旗`, 'green')  
            })
        }

        // 确认该房间已被搜索
        delete this.room.memory.observer.checkRoomName
    }

    /**
     * 发布新的采集任务
     * 会自行插旗并发布角色组
     * 
     * @param target 要采集的资源
     */
    private newHarvesteTask(target: StructurePowerBank | Deposit): OK | ERR_INVALID_TARGET {
        if (target instanceof StructurePowerBank) {
            const targetFlagName = `${STRUCTURE_POWER_BANK} ${this.room.name} ${Game.time}`
            target.pos.createFlag(targetFlagName)

            // 更新数量
            this.room.memory.observer.pbNumber += 1
            // 计算应该发布的采集小组数量，最高两组
            const groupNumber = target.pos.getFreeSpace().length > 1 ? 2 : 1
            
            // 发布 attacker 和 healer，搬运者由 attacker 在后续任务中自行发布
            for (let i = 0; i < groupNumber; i++) {
                const attackerName = `${targetFlagName} attacker${i}`
                const healerName = `${targetFlagName} healer${i}`

                // 添加采集小组
                creepApi.add(attackerName, 'pbAttacker', {
                    sourceFlagName: targetFlagName,
                    spawnRoom: this.room.name,
                    healerCreepName: healerName
                }, this.room.name)
                creepApi.add(healerName, 'pbHealer', {
                    creepName: `${targetFlagName} attacker${i}`
                }, this.room.name)
            }
        }
        else if (target instanceof Deposit) {
            const targetFlagName = `deposit ${this.room.name} ${Game.time}`
            target.pos.createFlag(targetFlagName)

            // 更新数量
            this.room.memory.observer.depositNumber += 1

            // 发布采集者，他会自行完成剩下的工作
            creepApi.add(`${targetFlagName} worker`, 'depositHarvester', {
                sourceFlagName: targetFlagName,
                spawnRoom: this.room.name
            }, this.room.name)
        }
        else return ERR_INVALID_TARGET

        
        return OK
    }

    /**
     * 获取指定房间视野
     */
    private obRoom(): void {
        if (Game.time % observerInterval) return

        // 执行视野获取
        const roomName = this.room.memory.observer.watchRooms[this.room.memory.observer.watchIndex]
        const obResult = this.observeRoom(roomName)
        // this.log(`ob 房间 ${roomName}`)

        // 标志该房间视野已经获取，可以进行检查
        if (obResult === OK) this.room.memory.observer.checkRoomName = roomName

        // 设置下一个要查找房间的索引
        this.room.memory.observer.watchIndex = this.room.memory.observer.watchIndex < (this.room.memory.observer.watchRooms.length - 1) ?
            this.room.memory.observer.watchIndex + 1 : 0
    }

    /**
     * 初始化 observer
     */
    private init(): void {
        this.room.memory.observer = {
            watchIndex: 0,
            watchRooms: [],
            pbNumber: 0,
            depositNumber: 0,
            pbMax: 1,
            depositMax: 1
        }
    }

    /**
     * 用户操作 - 查看状态
     */
    public stats(): string {
        if (!this.room.memory.observer) return `[${this.room.name} observer] 未启用，使用 .help() 来查看更多用法`
        
        let stats = [ `[${this.room.name} observer] 当前状态`, this.showList() ]
        // 这里并没有直接用 memory 里的信息，是因为为了保证准确性，并且下面会用 Game.flags 进行统计，所以也不用多费什么事情
        let pbNumber = 0
        let pbDetail = ''
        let depositNumber = 0
        let depositDetail = ''

        // 遍历所有 flag，统计两种资源的旗帜数量
        for (const flagName in Game.flags) {
            if (flagName.includes(`${STRUCTURE_POWER_BANK} ${this.room.name}`)) {
                pbNumber += 1
                pbDetail += ` ${Game.flags[flagName].pos.roomName}`
                continue
            }
            if (flagName.includes(`deposit ${this.room.name}`)) {
                depositNumber += 1
                depositDetail += ` ${Game.flags[flagName].pos.roomName}`
                continue
            }
        }

        stats.push(`[powerBank] 已发现：${pbNumber}/${this.room.memory.observer.pbMax} ${pbDetail ? '[位置]' : ''} ${pbDetail}`)
        stats.push(`[deposit] 已发现：${depositNumber}/${this.room.memory.observer.depositMax} ${pbDetail ? '[位置]' : ''} ${depositDetail}`)

        // 更新缓存信息
        this.room.memory.observer.pbNumber = pbNumber
        this.room.memory.observer.depositNumber = depositNumber

        return stats.join('\n')
    }

    /**
     * 设置 observer 对 pb、deposit 的搜索上限
     * 
     * @param type 要设置的类型
     * @param max 要设置的最大值
     */
    public setMax(type: 'powerbank' | 'deposit', max: number): string {
        if (!this.room.memory.observer) return `[${this.room.name} observer] 未启用，使用 .help() 来查看更多用法`
        if (max < 0) return `[${this.room.name} observer] 最大数量不得小于 0，请重新指定`

        if (type === 'powerbank') this.room.memory.observer.pbMax = max
        else if (type == 'deposit') this.room.memory.observer.depositMax = max
        else return `[${this.room.name} observer] 错误的类型，必须为 powerbank 或者 deposit`

        return `[${this.room.name} observer] 配置成功\n` + this.stats()
    }

    /**
     * 用户操作 - 新增监听房间
     * 
     * @param roomNames 要进行监听的房间名称
     */
    public add(...roomNames: string[]): string {
        if (!this.room.memory.observer) this.init()

        // 确保新增的房间名不会重复
        this.room.memory.observer.watchRooms = _.uniq([ ...this.room.memory.observer.watchRooms, ...roomNames])

        return `[${this.room.name} observer] 已添加，${this.showList()}`
    }

    /**
     * 用户操作 - 移除监听房间
     * 
     * @param roomNames 不在监听的房间名
     */
    public remove(...roomNames: string[]): string {
        if (!this.room.memory.observer) this.init()

        // 移除指定房间
        this.room.memory.observer.watchRooms = _.difference(this.room.memory.observer.watchRooms, roomNames)
        
        return `[${this.room.name} observer] 已移除，${this.showList()}`
    }

    /**
     * 用户操作 - 暂停 observer
     */
    public off(): string {
        if (!this.room.memory.observer) return `[${this.room.name} observer] 未启用`

        this.room.memory.observer.pause = true

        return `[${this.room.name} observer] 已暂停`
    }

    /**
     * 用户操作 - 重启 observer
     */
    public on(): string {
        if (!this.room.memory.observer) return `[${this.room.name} observer] 未启用`

        delete this.room.memory.observer.pause

        return `[${this.room.name} observer] 已恢复, ${this.showList()}`
    }

    /**
     * 用户操作 - 清空房间列表
     */
    public clear(): string {
        if (!this.room.memory.observer) this.init()

        this.room.memory.observer.watchRooms = []

        return `[${this.room.name} observer] 已清空监听房间`
    }

    /**
     * 用户操作 - 显示当前监听的房间列表
     * 
     * @param noTitle 该参数为 true 则不显示前缀
     */
    public showList(): string {
        const result = this.room.memory.observer ? 
        `监听中的房间列表: ${this.room.memory.observer.watchRooms.map((room, index) => {
            if (index === this.room.memory.observer.watchIndex) return colorful(room, 'green')
            else return room
        }).join(' ')}` :
        `未启用`

        return result
    }

    /**
     * 用户操作 - 帮助
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
                title: '设置 observer 对 pb、deposit 的搜索上限',
                params: [
                    { name: 'type', desc: 'powerbank 或 deposit 之一' },
                    { name: 'max', desc: '查找的最大值' }
                ],
                functionName: 'setMax'
            },
            {
                title: '显示状态',
                functionName: 'stats'
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
