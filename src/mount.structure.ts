import { creepConfigs, observeRooms } from './config'
import { bodyConfigs, creepDefaultMemory, repairSetting, reactionSource, LAB_STATE, labTarget, FACTORY_LOCK_AMOUNT, BOOST_STATE, powerSettings } from './setting'
import { ROOM_TRANSFER_TASK } from './roles.advanced'
import { createHelp } from './utils'

// 挂载拓展到建筑原型
export default function () {
    _.assign(StructureSpawn.prototype, SpawnExtension.prototype)
    _.assign(StructureTower.prototype, TowerExtension.prototype)
    _.assign(StructureLink.prototype, LinkExtension.prototype)
    _.assign(StructureFactory.prototype, FactoryExtension.prototype)
    _.assign(StructureTerminal.prototype, TerminalExtension.prototype)
    _.assign(StructureExtractor.prototype, ExtractorExtension.prototype)
    _.assign(StructureLab.prototype, LabExtension.prototype)
    _.assign(StructureNuker.prototype, NukerExtension.prototype)
    _.assign(StructurePowerSpawn.prototype, PowerSpawnExtension.prototype)
    _.assign(StructureObserver.prototype, ObserverExtension.prototype)
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
        // [重要] 执行 creep 数量控制器
        if (!Game._hasRunCreepNumberController) {
            this.creepNumberController()
            Game._hasRunCreepNumberController = true
        }

        if (this.spawning) {
            /**
             * 如果孵化已经开始了，就向物流队列推送任务
             * 不在 mySpawnCreep 返回 OK 时判断是因为：
             * 由于孵化是在 tick 末的行动执行阶段进行的，所以能量在 tick 末期才会从 extension 中扣除
             * 如果返回 OK 就推送任务的话，就会出现任务已经存在了，而 extension 还是满的
             * 而 creep 恰好就是在这段时间里执行的物流任务，就会出现：
             * mySpawnCreep 返回 OK > 推送填充任务 > creep 执行任务 > 发现能量都是满的 > 移除任务 > tick 末期开始孵化 > extension 扣除能量的错误逻辑
             */
            if (this.spawning.needTime - this.spawning.remainingTime == 1) this.room.addRoomTransferTask({ type: ROOM_TRANSFER_TASK.FILL_EXTENSION }, 1)
            return
        }
        // 内存里没有生成队列 / 生产队列为空 就啥都不干
        if (this.spawning || !this.memory.spawnList || this.memory.spawnList.length == 0) return 
        // 进行生成
        const spawnResult: MySpawnReturnCode = this.mySpawnCreep(this.memory.spawnList[0])

        // 生成成功后移除任务
        if (spawnResult == OK) this.memory.spawnList.shift()
    }

    /**
     * creep 数量控制器
     * 
     * 每 tick 执行一次, 通过检查死亡 creep 的记忆来确定哪些 creep 需要重生
     * 此函数可以同时清除死去 creep 的内存
     */
    private creepNumberController(): void {
        for (const name in Memory.creeps) {
            // 如果 creep 已经凉了
            if (!Game.creeps[name]) {
                const role: string = Memory.creeps[name].role
                // 获取配置项
                const creepConfig: ICreepConfig = creepConfigs[role]
                if (!creepConfig) {
                    console.log(`死亡 ${name} 未找到对应 creepConfig, 已删除`)
                    delete Memory.creeps[name]
                    return
                }
    
                // 检查指定的 spawn 中有没有它的生成任务
                const spawn = Game.spawns[creepConfig.spawn]
                if (!spawn) {
                    console.log(`死亡 ${name} 未找到 ${creepConfig.spawn}`)
                    return
                }
                // 没有的话加入生成
                if (!spawn.hasTask(role)) {
                    spawn.addTask(role)
                    // console.log(`将 ${role} 加入 ${creepConfig.spawn} 生成队列`)
                }
                // 有的话删除过期内存
                else {
                    delete Memory.creeps[name]
                    // console.log('清除死去 creep 记忆', name)
                }
            }
        }
    }
    
    /**
     * 向生产队列里推送一个生产任务
     * 
     * @param taskName config.creep.ts 文件里 creepConfigs 中定义的任务名
     * @returns 当前任务在队列中的排名
     */
    public addTask(taskName: string): number {
        if (!this.memory.spawnList) this.memory.spawnList = []
        // 先检查下任务是不是已经在队列里了
        if (!this.hasTask(taskName)) {
            // 任务加入队列
            this.memory.spawnList.push(taskName)
            return this.memory.spawnList.length - 1
        }
        // 如果已经有的话返回 -1
        else return -1
    }

    /**
     * 检查生产队列中是否包含指定任务
     * 
     * @param taskName 要检查的任务名
     * @returns true/false 有/没有
     */
    public hasTask(taskName: string): boolean {
        if (!this.memory.spawnList) this.memory.spawnList = []
        return this.memory.spawnList.indexOf(taskName) > -1
    }

    /**
     * 清空任务队列
     * 非测试情况下不要调用！
     */
    public clearTask(): void {
        this.memory.spawnList = []
    }

    /**
     * 将当前任务挂起
     * 任务会被移动至队列末尾
     */
    private hangTask(): void {
        const task = this.memory.spawnList.shift()
        this.memory.spawnList.push(task)
    }

    /**
     * 从 spawn 生产 creep
     * 
     * @param configName 对应的配置名称
     * @returns 无需生成 creep 时返回 CREEP_DONT_NEED_SPAWN，其他情况返回 Spawn.spawnCreep 的返回值
     */
    private mySpawnCreep(configName): MySpawnReturnCode {
        const creepConfig = creepConfigs[configName]
        // 如果配置列表中已经找不到该 creep 的配置了 则直接移除该生成任务
        if (!creepConfig) return <OK>0

        // 检查是否需要生成
        if (creepConfig.isNeed) {
            // 每 5 tick 才会检查一次
            if (Game.time % 5) {
                if (this.memory.spawnList.length > 1) this.hangTask()
                return <CREEP_DONT_NEED_SPAWN>-101
            }
            // 检查不通过依旧会挂起
            else if (!creepConfig.isNeed(this.room)) {
                if (this.memory.spawnList.length > 1) this.hangTask()
                return <CREEP_DONT_NEED_SPAWN>-101
            }
        }

        // 设置 creep 内存
        let creepMemory: CreepMemory = _.cloneDeep(creepDefaultMemory)
        creepMemory.role = configName

        // 获取身体部件, 优先使用 bodys
        const bodys = creepConfig.bodys ? creepConfig.bodys : this.getBodys(creepConfig.bodyType)
        
        const spawnResult: ScreepsReturnCode = this.spawnCreep(bodys, configName, {
            memory: creepMemory
        })
        // 检查是否生成成功
        if (spawnResult == OK) {
            // console.log(`${creepConfig.spawn} 正在生成 ${configName} ...`)
            return <OK>0
        }
        else if (spawnResult == ERR_NAME_EXISTS) {
            console.log(`${configName} 已经存在 ${creepConfig.spawn} 将不再生成 ...`)
            return <OK>0
        }
        else {
            console.log(`[生成失败] ${creepConfig.spawn} 任务 ${configName} 挂起, 错误码 ${spawnResult}`)
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
        return `${this} 已注册为中央 link`
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
        if (this.room.hasCenterTask(this.id)) return 

        this.room.addCenterTask({
            submitId: this.id,
            sourceId: this.id,
            targetId: this.room.storage.id,
            resourceType: RESOURCE_ENERGY,
            amount: this.energy
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
            if (upgradeLink && upgradeLink.energy == 0) {
                this.transferEnergy(upgradeLink) 
                return
            }
        }
        // 发送给 center link
        if (this.room.memory.centerLinkId) {
            const centerLink = this.getLinkByMemoryKey('centerLinkId')
            if (!centerLink) return

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
 * 当工厂中的目标商品数量超过该值时
 * 所有的目标商品都将转移至 termial 
 */
const FACTORY_TARGET_LIMIT = 500

/**
 * Factory 拓展
 * @todo 检查是否有资源 没有就待机
 */
class FactoryExtension extends StructureFactory {
    public work(): void {
        // 没有冷却好就直接跳过
        if (this.cooldown !== 0) return
        // 获取不到目标资源就跳过
        const targetResource: ResourceConstant = this.room.getFactoryTarget()
        if (!targetResource) return
        
        // 优先把做好的资源转移出去, 默认为 500
        if (this.store.getUsedCapacity(targetResource) >= FACTORY_TARGET_LIMIT) {
            this.addPutTask(targetResource)
            return
        }
        
        // 收集需要的资源
        if (!this.getNeedResource(targetResource)) return

        // 资源凑齐了就直接开始生成
        this.produce(<CommodityConstant|MineralConstant|RESOURCE_GHODIUM>targetResource)
    }

    /**
     * 装填合成需要的资源
     * 
     * @param target 想要合成的资源
     * @returns 是否装填完成
     */
    private getNeedResource(target: ResourceConstant): boolean {
        const componentResources = COMMODITIES[target].components
        for (const component in componentResources) {
            // 如果自己存储里该资源的数量不足，则发布任务
            if (this.store[component] < componentResources[component]) {
                // 检查 terminal 中底物数量是否足够
                if (!this.room.terminal) {
                    console.log(`[${this.room.name} factory] 未发现 terminal，已停工`)
                    return false
                }

                // 如果底物有数量限制的话要先达标才会发布任务
                if ((component in FACTORY_LOCK_AMOUNT) && (this.room.terminal.store[component] < FACTORY_LOCK_AMOUNT[component])) {
                    // console.log(`[${this.room.name} factory] ${component} 数量不足, ${this.room.terminal.store[component]}/${FACTORY_LOCK_AMOUNT[component]}，已停工`)
                    // 在这里添加进入休眠阶段
                    return false
                }

                this.addGetTask(component as ResourceConstant, componentResources[component])
                return false
            }
        }

        return true
    }

    /**
     * 向房间中央转移队列发布获取资源任务
     * 从 storage 中获取指定的资源
     * 
     * @param resourceType 想要获取的资源类型
     * @param amount 想要获取的资源数量
     */
    public addGetTask(resourceType: ResourceConstant, amount: number): void {
        // 发布前先检查下有没有任务
        if (this.room.hasCenterTask(this.id)) return 

        this.room.addCenterTask({
            submitId: this.id,
            // 如果是能量就从 storage 里拿，是其他资源就从 terminal 里拿
            sourceId: resourceType == RESOURCE_ENERGY ? this.room.storage.id : this.room.terminal.id,
            targetId: this.id,
            resourceType: resourceType,
            amount: amount
        })
    }
    
    /**
     * 向房间中央转移队列发布移出资源任务
     * 将自己 store 中合成好的资源全部转移到 termial 中
     * 
     * @param resourceType 想要转移出去的资源类型
     */
    public addPutTask(resourceType: ResourceConstant): void {
        // 发布前先检查下有没有任务
        if (this.room.hasCenterTask(this.id)) return 

        this.room.addCenterTask({
            submitId: this.id,
            sourceId: this.id,
            targetId: this.room.terminal.id,
            resourceType: resourceType,
            amount: this.store.getUsedCapacity(resourceType)
        })
    }
}

// Terminal 拓展
class TerminalExtension extends StructureTerminal {
    public work(): void {
        // 没有冷却好或者不到 10 tick 就跳过
        if (this.cooldown !== 0 || Game.time % 10) return

        // 优先执行共享任务
        this.execShareTask()

        // 执行终端工作
        const resource = this.getResourceByIndex()
        // 没有配置监听任务的话就跳过
        if (!resource) return 

        // 只有 dealOrder 下命令了才能继续执行 ResourceListener
        if (this.dealOrder(resource)) this.ResourceListener(resource)
    }

    public execShareTask(): void {
        // 获取任务
        const task = this.room.memory.shareTask
        if (!task) return 

        // 如果自己存储的资源数量已经足够了
        if (this.store[task.resourceType] >= task.amount) {
            const cost = Game.market.calcTransactionCost(task.amount, this.room.name, task.target)
            
            // 如果要转移能量就需要对路费是否足够的判断条件进行下特殊处理
            const costCondition = (task.resourceType === RESOURCE_ENERGY) ?
                this.store[RESOURCE_ENERGY] - task.amount < cost :
                this.store[RESOURCE_ENERGY] < cost

            // 如果路费不够的话就继续等
            if (costCondition) {
                this.getEnergy(cost)
                return 
            }

            // 路费够了就执行转移
            const sendResult = this.send(task.resourceType, task.amount, task.target, `HaveFun! 来自 ${this.room.controller.owner.username} 的资源共享 - ${this.room.name}`)
            if (sendResult == OK) {
                // console.log(`${this.room.name} 完成了向 ${task.target} 的资源转移任务 ${task.resourceType} ${task.amount}`)
                delete this.room.memory.shareTask
            }
            else if (sendResult == ERR_INVALID_ARGS) {
                console.log(`${this.room.name} 中的共享任务参数异常，无法执行传送，已移除`)
                delete this.room.memory.shareTask
            }
            else {
                console.log(`${this.room.name} 执行共享任务出错, 错误码：${sendResult}`)
            }
        }
        // 如果不足
        else {
            // 如果要共享能量，则从 storage 里拿
            if (task.resourceType === RESOURCE_ENERGY) {
                this.getEnergy(task.amount - this.store[RESOURCE_ENERGY])
            }
        }
    }

    /**
     * 继续处理之前缓存的订单
     * 
     * @returns 是否需要继续执行 ResourceListener
     */
    public dealOrder(resource: ITerminalListenerTask): boolean {
        // 没有订单需要处理
        if (!this.room.memory.targetOrderId) return true
        // 获取订单
        const targetOrder = Game.market.getOrderById(this.room.memory.targetOrderId)
        // 订单无效则移除缓存并继续检查
        if (!targetOrder) {
            delete this.room.memory.targetOrderId
            return true
        }

        // 计算要传输的数量
        let amount = this.store[resource.type] - resource.amount
        if (amount < 0) amount *= -1
        // 如果订单剩下的不多了 就用订单的数量
        if (targetOrder.amount < amount) amount = targetOrder.amount
        // 计算路费
        const cost = Game.market.calcTransactionCost(amount, this.room.name, targetOrder.roomName)
        // 如果路费不够的话就继续等
        if (this.store.getUsedCapacity(RESOURCE_ENERGY) < cost) {
            this.getEnergy(cost)
            return false
        }

        // 交易
        const dealResult = Game.market.deal(targetOrder.id, amount, this.room.name)
        // 检查返回值
        if (dealResult === OK) {
            const crChange = (targetOrder.type == ORDER_BUY ? '+ ' : '- ') + (amount * targetOrder.price).toString() + ' Cr' 
            const introduce = `${(targetOrder.type == ORDER_BUY ? '卖出' : '买入')} ${amount} ${targetOrder.resourceType} 单价: ${targetOrder.price}`
            console.log(`[${this.room.name} terminal] 交易成功! ${introduce} ${crChange}`)
            delete this.room.memory.targetOrderId
            this.setNextIndex()
            return false // 把这个改成 true 可以加快交易速度
        }
        else if (dealResult === ERR_INVALID_ARGS) {
            delete this.room.memory.targetOrderId
            
        }
        else {
            console.log(`[终端警告] ${this.room.name} 处理订单异常 ${dealResult}`)
        }
    }

    /**
     * 资源监听
     * 检查资源是否符合用户给定的期望
     */
    public ResourceListener(resource: ITerminalListenerTask): void {
        const resourceAmount = this.store[resource.type]
        // 最大值监听，超过才进行卖出
        if (resource.mod == 'max') {
            if (resourceAmount <= resource.amount) return this.setNextIndex()
        }
        // 最小值监听，再判断是从市场买入还是从其他房间共享
        else if (resource.mod == 'min') {
            // console.log('最小值检查！', resourceAmount, resource.type, resource.amount)
            if (resourceAmount >= resource.amount) return this.setNextIndex()
            else {
                // 从其他房间共享
                if (resource.supplementAction == 'share') {
                    const getShareRequest = this.room.shareRequest(resource.type, resource.amount - resourceAmount)
                    // console.log(`${this.room.name} 想要从资源共享获取 ${resource.type} 数量: ${resource.amount - resourceAmount}  请求结果为 ${getShareRequest}`)
                    return this.setNextIndex()
                }
            }
        }
        // 双向监听，必须相等才不会触发操作
        else {
            if (resourceAmount == resource.amount) return this.setNextIndex()
        }

        // 获取订单
        const targetOrder = this.getOrder({
            // 根据存储的数量是否超过上限来决定是买单还是卖单
            type: (resourceAmount > resource.amount) ? ORDER_BUY : ORDER_SELL,
            resourceType: resource.type
        })
        if (!targetOrder) {
            console.log(`${this.room.name} 没有为 ${resource.type} 找到合适的订单`)
            this.setNextIndex()
            return
        }
        
        // console.log(`${this.room.name} 为 ${targetOrder.resourceType} 找到了一个合适的订单 类型: ${targetOrder.type} 单价: ${targetOrder.price}`)
        // 订单合适，写入缓存并要路费
        this.room.memory.targetOrderId = targetOrder.id
        // 计算要传输的数量
        let amount = resourceAmount - resource.amount
        if (amount < 0) amount *= -1
        // 计算路费
        const cost = Game.market.calcTransactionCost(amount, this.room.name, targetOrder.roomName)
        // 如果路费不够的话就问 sotrage 要
        if (this.store.getUsedCapacity(RESOURCE_ENERGY) < cost) {
            this.getEnergy(cost)
        }
    }

    /**
     * 将索引指向下一个要监听的资源
     */
    private setNextIndex(): void {
        let index = this.room.memory.terminalIndex | 0
        const tasksLength = Object.keys(this.room.memory.terminalTasks).length
        // 循环设置索引
        this.room.memory.terminalIndex = (index + 1 >= tasksLength) ? 0 : index + 1
    }

    /**
     * 从内存中索引获取正在监听的资源
     * 
     * @returns 该资源的信息，格式如下：
     *   @property {} type 资源类型
     *   @property {} amount 期望数量
     */
    private getResourceByIndex(): ITerminalListenerTask | null {
        if (!this.room.memory.terminalTasks) return null
        const resources = Object.keys(this.room.memory.terminalTasks)
        if (!resources || resources.length == 0) return null
        const index = this.room.memory.terminalIndex | 0

        const resourceType = resources[index]

        return {
            type: <ResourceConstant>resourceType,
            ...this.room.memory.terminalTasks[resourceType]
        }
    }

    /**
     * 寻找合适的订单
     * 该方法**不会**将订单缓存到房间内存
     * 
     * @param config 市场交易任务
     * @returns 找到则返回订单, 否找返回 null
     */
    private getOrder(filter: OrderFilter): Order | null {
        const orders = Game.market.getAllOrders(order => {
            return order.type === filter.type && 
                order.resourceType === filter.resourceType && 
                order.amount > 100
        })
        // 没找到订单就返回空
        if (orders.length <= 0) return null

        // price 升序找到最适合的订单
        // 买入找price最低的 卖出找price最高的
        const sortedOrders = _.sortBy(orders, order => order.price)
        // console.log('订单单价', sortedOrders.map(order => order.price))
        const targetOrder = sortedOrders[filter.type === ORDER_SELL ? 0 : (sortedOrders.length - 1)]
        // console.log('选中订单价格', targetOrder.resourceType, targetOrder.type, targetOrder.price)

        // 最后进行均价检查
        if (!this.checkPrice(targetOrder)) return null
        else return targetOrder
    }

    /**
     * 检查订单单价是否合适
     * 防止投机玩家的过低或过高订单
     * 
     * @param targetOrder 目标订单
     */
    private checkPrice(targetOrder: Order): boolean {
        const history = Game.market.getHistory(<ResourceConstant>targetOrder.resourceType)
        // 没有历史记录的话直接运行购买
        if (history.length <= 0) return true
        // 以昨日均价为准
        // console.log(JSON.stringify(history[0], null, 4))
        const avgPrice = history[0].avgPrice

        // 目标订单的价格要在历史价格上下 0.5 左右的区间内浮动才算可靠
        // 卖单的价格不能太高
        if (targetOrder.type == ORDER_SELL) {
            // console.log(`${targetOrder.price} <= ${avgPrice * 1.5}`)
            if (targetOrder.price <= avgPrice * 1.8) return true
        }
        // 买单的价格不能太低
        else {
            // console.log(`${targetOrder.price} >= ${avgPrice * 0.5}`)
            if (targetOrder.price >= avgPrice * 0.5) return true
        }
        return false
    }

    /**
     * 从 storage 获取能量
     * @param amount 需要能量的数量
     */
    private getEnergy(amount: number): void {
        // 发布前先检查下有没有任务
        if (this.room.hasCenterTask(this.id)) return 

        this.room.addCenterTask({
            submitId: this.id,
            sourceId: this.room.storage.id,
            targetId: this.id,
            resourceType: RESOURCE_ENERGY,
            amount
        })
    }
}

// Extractor 拓展
class ExtractorExtension extends StructureExtractor {
    public work(): void {
        if (this.room.memory.mineralId) return
        
        // 获取 mineral 并将其 id 保存至房间内存
        const targets = this.room.find(FIND_MINERALS)
        const mineral = targets[0]
        this.room.memory.mineralId = mineral.id

        // 兜底
        if (!Memory.resourceSourceMap) Memory.resourceSourceMap = {}
        if (!Memory.resourceSourceMap[mineral.mineralType]) Memory.resourceSourceMap[mineral.mineralType] = []
        
        // 在资源来源表里进行注册
        const alreadyRegister = Memory.resourceSourceMap[mineral.mineralType].find(roomName => roomName == this.room.name)
        if (!alreadyRegister) Memory.resourceSourceMap[mineral.mineralType].push(this.room.name)
    }
}

// lab 拓展
class LabExtension extends StructureLab {
    public work(): void {
        // 房间没有初始化 lab 集群则直接退出
        if (!this.room.memory.lab) return
        // lab 集群已被暂停 同样退出
        if (this.room.memory.lab.pause) return

        // [重要] 执行 lab 集群作业
        if (!this.room._hasRunLab) {
            this.runLab()
            this.room._hasRunLab = true
        }

        // 如果是 outLab 就更新下自己的库存到 memory
        if (this.id in this.room.memory.lab.outLab) this.room.memory.lab.outLab[this.id] = this.store[this.mineralType] | 0
    }

    /**
     * lab 集群的工作总入口
     */
    private runLab(): void {
        switch (this.room.memory.lab.state) {
            case LAB_STATE.GET_TARGET: 
                if (Game.time % 10) return
                this.labGetTarget()
            break
            case LAB_STATE.GET_RESOURCE:
                if (Game.time % 15) return
                this.labGetResource()
            break
            case LAB_STATE.WORKING:
                if (Game.time % 2) return
                this.labWorking()
            break
            case LAB_STATE.PUT_RESOURCE:
                if (Game.time % 15) return
                this.labPutResource()
            break
            case LAB_STATE.BOOST:
                if (Game.time % 5) return
                this.boostController()
            break
            default:
                if (Game.time % 10) return
                this.labGetTarget()
            break
        }
    }

    /**
     * boost - 流程控制器
     */
    private boostController(): void {
        switch (this.room.memory.boost.state) {
            case BOOST_STATE.GET_RESOURCE: 
                this.boostGetResource()
            break
            case BOOST_STATE.GET_ENERGY:
                this.boostGetEnergy()
            break
            case BOOST_STATE.WAIT_BOOST:
                // 感受宁静
            break
            case BOOST_STATE.CLEAR:
                this.boostClear()
            break
            default:
                this.boostGetResource()
            break
        }
    }

    /**
     * boost 阶段：获取强化材料
     */
    private boostGetResource(): void {
        // console.log(`[${this.room.name} boost] 获取 boost 材料`)
        
        // 获取 boost 任务
        const boostTask = this.room.memory.boost

        // 遍历检查资源是否到位
        let allResourceReady = true
        for (const resourceType in boostTask.lab) {
            const lab = Game.getObjectById<StructureLab>(boostTask.lab[resourceType])
            if (!lab) continue

            // 只要有 lab 里的资源没填好就算没有就绪
            if (lab.store[resourceType] < (boostTask.config[resourceType] * LAB_BOOST_MINERAL)) allResourceReady = false
        }

        // 都就位了就进入下一个阶段
        if (allResourceReady) {
            console.log(`[${this.room.name} boost] 材料准备完成，开始填充能量`)
            this.room.memory.boost.state = BOOST_STATE.GET_ENERGY
        }
        // 否则就发布任务
        else if (!this.room.hasRoomTransferTask(ROOM_TRANSFER_TASK.BOOST_GET_RESOURCE)) {
            // 遍历整理所有要转移的资源、目标 labId 及数量
            let resources = []
            for (const resourceType in boostTask.lab) {
                resources.push({
                    type: resourceType,
                    labId: boostTask.lab[resourceType],
                    number: boostTask.config[resourceType] * LAB_BOOST_MINERAL
                })
            }

            // 发布任务
            this.room.addRoomTransferTask({
                type: ROOM_TRANSFER_TASK.BOOST_GET_RESOURCE,
                resource: resources
            })
        }
    }

    /**
     * boost 阶段：获取能量
     */
    private boostGetEnergy(): void {
        // console.log(`[${this.room.name} boost] 获取强化能量`)
        
        const boostTask = this.room.memory.boost

        // 遍历所有执行强化的 lab
        for (const resourceType in boostTask.lab) {
            const lab: StructureLab = Game.getObjectById(boostTask.lab[resourceType])

            // 获取强化该部件需要的最大能量
            const needEnergy = boostTask.config[resourceType] * LAB_BOOST_ENERGY

            // 有 lab 能量不达标的话就发布能量填充任务
            if (lab && lab.store[RESOURCE_ENERGY] < needEnergy) {
                // 有 lab 能量不满的话就发布任务
                if (!this.room.hasRoomTransferTask(ROOM_TRANSFER_TASK.BOOST_GET_ENERGY)) {
                    this.room.addRoomTransferTask({
                        type: ROOM_TRANSFER_TASK.BOOST_GET_ENERGY
                    })
                }
                return
            }
        }

        // 能循环完说明能量都填好了
        this.room.memory.boost.state = BOOST_STATE.WAIT_BOOST
        console.log(`[${this.room.name} boost] 能量填充完成，等待强化`)
    }

    /**
     * boost 阶段：回收材料
     * 将强化用剩下的材料从 lab 中转移到 terminal 中
     */
    private boostClear(): void {
        // console.log(`[${this.room.name} boost] 回收材料`)

        // 所有执行强化的 labId
        const boostLabs = Object.values(this.room.memory.boost.lab)

        // 检查是否存在没搬空的 lab
        for (const labId of boostLabs) {
            const lab: StructureLab = Game.getObjectById(labId)
            // mineralType 不为空就说明还有资源没拿出来
            if (lab && lab.mineralType) {
                // 发布任务
                if (!this.room.hasRoomTransferTask(ROOM_TRANSFER_TASK.BOOST_CLEAR)) {
                    console.log(`[${this.room.name} boost] 开始回收材料`)
                    this.room.addRoomTransferTask({
                        type: ROOM_TRANSFER_TASK.BOOST_CLEAR
                    })
                }
                return
            }
        }

        // 检查是否有 boostGetResource 任务存在
        // 这里检查它的目的是防止 transfer 还在执行 BOOST_GET_RESOURCE 任务，如果过早的完成 boost 进程的话
        // 就会出现 lab 集群已经回到了 GET_TARGET 阶段但是 lab 里还有材料存在
        if (this.room.hasRoomTransferTask(ROOM_TRANSFER_TASK.BOOST_GET_RESOURCE)) return
        // lab 净空并且 boost clear 物流任务完成，就算是彻底完成了 boost 进程
        else if (!this.room.hasRoomTransferTask(ROOM_TRANSFER_TASK.BOOST_CLEAR)) {
            console.log(`[${this.room.name} boost] 材料回收完成`)
            delete this.room.memory.boost
            this.room.memory.lab.state = LAB_STATE.GET_TARGET
        }
    }

    /**
     * lab 阶段：获取全局目标
     */
    private labGetTarget(): void {
        // console.log(`[${this.room.name} lab] - 获取目标`)
        // 如果有 boost 任务的话就优先执行
        if (this.room.memory.boost) {
            this.room.memory.lab.state = LAB_STATE.BOOST
            return
        }

        // 还有 boost 任务再排队的话就等会
        if (this.room.memory.hasMoreBoost) return 
        
        // 获取目标
        if (!this.room.memory.lab.targetIndex) this.room.memory.lab.targetIndex = 0
        const resource = labTarget[this.room.memory.lab.targetIndex]

        // 如果 targetIndex 没有找到对应资源的话，就更新索引再试一次
        // 一般都是因为修改了 labTarget 导致的
        if (!resource) {
            this.setNextIndex()
            return
        }

        // 检查目标资源数量是否已经足够
        if (!this.room.terminal) return console.log(`[${this.room.name} lab] 错误! 找不到终端`)
        if (this.room.terminal.store[resource.target] >= resource.number) {
            this.setNextIndex()
            return
        }
        
        // 确认是否可以合成
        const canReactionAmount = this.labAmountCheck(resource.target)
        // 可以合成
        if (canReactionAmount > 0) {
            this.room.memory.lab.state = LAB_STATE.GET_RESOURCE
            // 单次作业数量不能超过 lab 容量上限
            this.room.memory.lab.targetAmount = canReactionAmount > LAB_MINERAL_CAPACITY ? LAB_MINERAL_CAPACITY : canReactionAmount
            console.log(`[${this.room.name} lab] 指定目标：${resource.target}`)
        }
        // 合成不了
        else {
            // console.log(`[${this.room.name} lab] 无法合成 ${resource.target}`)
            this.setNextIndex()
        }
    }

    /**
     * lab 阶段：获取底物
     */
    private labGetResource(): void {
        // console.log(`[${this.room.name} lab] - 获取底物`)
        
        // 检查是否有能量移入任务
        if (this.room.hasRoomTransferTask(ROOM_TRANSFER_TASK.LAB_IN)) return

        // 检查 InLab 底物数量，都有底物的话就进入下个阶段
        const inLabs = this.room.memory.lab.inLab.map(labId => Game.getObjectById(labId) as StructureLab)
        const hasEmptyLab = inLabs.find(lab => !lab.mineralType)
        if (!hasEmptyLab) {
            this.room.memory.lab.state = LAB_STATE.WORKING
            return
        }

        // 获取终端
        const termial = this.room.terminal
        if (!termial) return console.log(`[${this.room.name} lab] 错误! 找不到终端`)

        // 检查底物是否足够
        const targetResource = labTarget[this.room.memory.lab.targetIndex].target
        const hasInsufficientResource = reactionSource[targetResource].find(res => termial.store[res] < this.room.memory.lab.targetAmount)

        // 有不足的底物, 重新查找目标
        if (hasInsufficientResource) {
            this.room.memory.lab.state = LAB_STATE.GET_TARGET
            this.setNextIndex()
        }
        // 没有就正常发布底物填充任务
        else this.addTransferTask(ROOM_TRANSFER_TASK.LAB_IN)
    }

    /**
     * lab 阶段：进行反应
     */
    private labWorking(): void {
        // console.log(`[${this.room.name} lab] - 进行反应`)

        const labMemory = this.room.memory.lab

        // 获取 inLab
        let inLabs: StructureLab[] = []
        labMemory.inLab.forEach(labId => {
            const lab = Game.getObjectById(labId) as StructureLab
            if (!lab) console.log(`[${this.room.name} lab] 错误! 找不到 inLab ${labId}`)
            else inLabs.push(lab)
        })
        if (inLabs.length < 2) return

        // 底物用光了就进入下一阶段        
        const notRunOutResource = inLabs.find(lab => lab.store[lab.mineralType] >= 0)
        if (!notRunOutResource) {
            // console.log(`[${this.room.name} lab] - 反应完成，移出产物`)
            this.room.memory.lab.state = LAB_STATE.PUT_RESOURCE
            return
        }

        // 获取本次要进行反应的 outLab
        const outLabIds = Object.keys(labMemory.outLab)
        const outLab: StructureLab = Game.getObjectById(outLabIds[labMemory.outLabIndex])
        
        // 兜底
        if (!outLab) {
            console.log(`[${this.room.name} lab] 错误! 找不到 outLab ${labMemory.outLabIndex}, 已移除`)
            delete this.room.memory.lab.outLab[outLabIds[labMemory.outLabIndex]]
            this.setNextOutLabIndex()
            return
        }
        if (outLab.cooldown != 0) return

        outLab.runReaction(inLabs[0], inLabs[1])
        this.setNextOutLabIndex()
    }

    /**
     * lab 阶段：移出产物
     */
    private labPutResource(): void {
        // console.log(`[${this.room.name} lab] - 移出产物`)

        // 检查是否已经有正在执行的移出任务嘛
        if (this.room.hasRoomTransferTask(ROOM_TRANSFER_TASK.LAB_OUT)) return

        // 检查资源有没有全部转移出去
        for (const labId in this.room.memory.lab.outLab) {
            if (this.room.memory.lab.outLab[labId] > 0) {
                // 没有的话就发布移出任务
                this.addTransferTask(ROOM_TRANSFER_TASK.LAB_OUT)
                return
            }
        }

        // 都移出去的话就可以开始新的轮回了
        this.room.memory.lab.state = LAB_STATE.GET_TARGET
        delete this.room.memory.lab.targetAmount
        this.setNextIndex()
    }

    /**
     * 将 lab.targetIndex 设置到下一个目标
     * 
     * @returns 当前的目标索引
     */
    private setNextIndex(): number {
        this.room.memory.lab.targetIndex = (this.room.memory.lab.targetIndex + 1 >= labTarget.length) ?
            0 : this.room.memory.lab.targetIndex + 1
        
        return this.room.memory.lab.targetIndex
    }

    /**
     * 将 lab.outLabIndex 设置到下一个 outLab
     * 
     * @returns 当前的 outLab 索引
     */
    private setNextOutLabIndex(): number {
        const outLabIds = Object.keys(this.room.memory.lab.outLab)
        const index = this.room.memory.lab.outLabIndex

        this.room.memory.lab.outLabIndex = index + 1 >= outLabIds.length ? 
            0 : index + 1
        
        return this.room.memory.lab.outLabIndex
    }

    /**
     * 查询目标资源可以合成的数量
     * 会查询 setting.ts 中的 reactionSource 来找到底物，然后在 terminal 中查找
     * 
     * @param resourceType 要查询的资源类型
     * @returns 可以合成的数量，为 0 代表无法合成
     */
    private labAmountCheck(resourceType: ResourceConstant): number {
        // 获取资源及其数量, 并将数量从小到大排序
        const needResourcesName = reactionSource[resourceType]
        if (!needResourcesName) {
            console.log(`[${this.room.name} lab] reactionSource 中未定义 ${resourceType}`)
            return 0
        }
        const needResources = needResourcesName
            .map(res => this.room.terminal.store[res] | 0)
            .sort((a, b) => a - b)

        // 找到能被5整除的最大底物数量
        if (needResources.length <= 0) return 0
        return needResources[0] - (needResources[0] % 5)
    }

    /**
     * 向房间物流队列推送任务
     * 任务包括：in(底物填充)、out(产物移出)
     * 
     * @param taskType 要添加的任务类型
     * @returns 是否成功添加了物流任务
     */
    private addTransferTask(taskType: string): boolean {
        const labMemory = this.room.memory.lab
        // 底物移入任务
        if (taskType == ROOM_TRANSFER_TASK.LAB_IN) {
            // 获取目标产物
            const targetResource = labTarget[this.room.memory.lab.targetIndex].target
            // 获取底物及其数量
            const resource = reactionSource[targetResource].map((res, index) => ({
                id: this.room.memory.lab.inLab[index],
                type: <ResourceConstant>res,
                amount: this.room.memory.lab.targetAmount
            }))

            // 发布任务
            return (this.room.addRoomTransferTask({
                type: ROOM_TRANSFER_TASK.LAB_IN,
                resource: resource
            }) == -1) ? false : true
        }
        // 产物移出任务
        else if (taskType == ROOM_TRANSFER_TASK.LAB_OUT) {
            // 获取还有资源的 lab, 将其内容物类型作为任务的资源类型
            let targetLab: StructureLab
            for (const outLabId in labMemory.outLab) {
                if (labMemory.outLab[outLabId] > 0) {
                    targetLab = Game.getObjectById(outLabId)
                    break
                }
            }
            if (!targetLab) return false

            // 发布任务
            return (this.room.addRoomTransferTask({
                type: ROOM_TRANSFER_TASK.LAB_OUT,
                resourceType: targetLab.mineralType
            }) == -1) ? false : true
        }
        else return false
    }
}

// nuker 拓展
class NukerExtension extends StructureNuker {
    public work(): void {
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
}

class PowerSpawnExtension extends StructurePowerSpawn {
    public work(): void {
        if(!this.room.memory.powerSpawn) return
        if(!this.room.memory.powerSpawn.process) return

        //powerSpawn 内 power 不足
        if(this.store[RESOURCE_POWER] < 10 && this.room.storage.store.getUsedCapacity(RESOURCE_POWER) > 0)
        {
            this.room.addRoomTransferTask({
                type: ROOM_TRANSFER_TASK.FILL_POWERSPAWN,
                id: this.id,
                resourceType: RESOURCE_POWER
            })
        }
        //powerSpawn 内 energy 不足且 storage 内 energy 充足
        if(this.store[RESOURCE_ENERGY] < 300 && this.room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > powerSettings.processEnergyLimit)
        {
            this.room.addRoomTransferTask({
                type: ROOM_TRANSFER_TASK.FILL_POWERSPAWN,
                id: this.id,
                resourceType: RESOURCE_ENERGY
            })
        }
        // 处理 power
        if(this.store[RESOURCE_ENERGY] > 50 && this.store[RESOURCE_POWER] > 0) this.processPower()
    }
}

class ObserverExtension extends StructureObserver {
    public work(): void {
        if (!this.room.memory.observer) return
        if (this.room.memory.observer.pause) return

        // 如果房间没有视野就获取视野，否则就执行搜索
        if (this.room.memory.observer.checked.isChecked) this.searchRoom()
        else this.checkRoom()
    }

    /**
     * 在房间内执行搜索
     * 该方法会搜索房间中的 deposits 和 power bank，一旦发现自动插旗
     */
    private searchRoom(): void {
        // 从内存中获取要搜索的房间
        const room = Game.rooms[this.room.memory.observer.checked.room]

        const deposits = room.find(FIND_DEPOSITS)
        // 查询deposit
        if (deposits) {
            for (const deposit of deposits) {
                const flags = deposit.pos.findInRange(FIND_FLAGS,1)
                if (flags.length == 0) {
                    room.createFlag(deposit.pos)
                    console.log(`[${this.room.name} Observer] ${this.room.memory.observer.checked.room} 检测到新deposit,已插旗`)
                }
            }
        }

        const pbs = room.find(FIND_STRUCTURES,{
            filter:structure => structure.structureType == STRUCTURE_POWER_BANK
        })
        // 查询pb
        if (pbs) {
            for (const powerBank of pbs) {
                const flags = powerBank.pos.findInRange(FIND_FLAGS,1)
                if (flags.length == 0) {
                    room.createFlag(powerBank.pos)
                    console.log(`[${this.room.name} Observer] ${this.room.memory.observer.checked.room} 检测到新pb,已插旗`)
                }
            }
        }

        // 确认该房间已被搜索
        this.room.memory.observer.checked.isChecked = false
   }

    /**
     * 获取指定房间视野
     */
    private checkRoom(): void {
        if (Game.time % 5) return

        // 执行视野获取
        this.observeRoom(observeRooms[this.room.memory.observer.listNum])

        // 标志该房间视野已经获取，可以进行检查
        this.room.memory.observer.checked.isChecked = true
        // 保存检查的名称
        this.room.memory.observer.checked.room = observeRooms[this.room.memory.observer.listNum]

        // 查询下一个房间
        this.room.memory.observer.listNum = this.room.memory.observer.listNum < (observeRooms.length - 1) ?
            this.room.memory.observer.listNum + 1 : 0
    }
}
