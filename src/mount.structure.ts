import { creepConfigs } from './config'
import { bodyConfigs, creepDefaultMemory, repairSetting } from './setting'
import { createHelp } from './utils'

// 挂载拓展到建筑原型
export default function () {
    _.assign(StructureSpawn.prototype, SpawnExtension.prototype)
    _.assign(StructureTower.prototype, TowerExtension.prototype)
    _.assign(StructureLink.prototype, LinkExtension.prototype)
    _.assign(StructureFactory.prototype, FactoryExtension.prototype)
    _.assign(StructureTerminal.prototype, TerminalExtension.prototype)
}

/**
 * 重要角色
 * creep 名包含下面的字符串即代表该角色是用于“维持房间spawn能量”
 */
const importantRoles = [ 'Harvester', 'Transfer' ]

/**
 * Spawn 原型拓展
 */
class SpawnExtension extends StructureSpawn {
    /**  
     * spawn 主要工作
     * @todo isNeed 不需要进行检查
     */
    public work(): void {
        // 自己已经在生成了 / 内存里没有生成队列 / 生产队列为空 就啥都不干
        if (this.spawning || !this.memory.spawnList || this.memory.spawnList.length == 0) return 
        // 进行生成
        const spawnSuccess: MySpawnReturnCode = this.mySpawnCreep(this.memory.spawnList[0])
        // if (this.room.name == 'W48S5') console.log("TCL: SpawnExtension -> spawnSuccess", this.room.name, spawnSuccess)

        switch (spawnSuccess) {
            case ERR_NOT_ENOUGH_ENERGY:
                // 失败了就检查下房间是不是危险了
                this.noCreepSave()
            break
            case OK:
                // 生成成功后移除任务
                this.memory.spawnList.shift()
            break
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
     * @param minBody 用最小身体部分生成
     * @returns 开始生成返回 true, 否则返回 false
     */
    private mySpawnCreep(configName, minBody: boolean = false): MySpawnReturnCode {
        const creepConfig = creepConfigs[configName]
        // 如果配置列表中已经找不到该 creep 的配置了 则直接移除该生成任务
        if (!creepConfig) return <OK>0
        // 如果 isNeed 表明不需要生成, 则将其移至队列末尾
        if (creepConfig.isNeed && !creepConfig.isNeed(this.room)) {
            this.hangTask()
            return <CREEP_DONT_NEED_SPAWN>-101
        }

        // 设置 creep 内存
        let creepMemory: CreepMemory = _.cloneDeep(creepDefaultMemory)
        creepMemory.role = configName
        const bodys: BodyPartConstant[] = minBody ? 
            bodyConfigs[creepConfig.bodyType][1] : // 最小的身体部件
            bodyConfigs[creepConfig.bodyType][this.room.controller.level] // 符合于房间等级的身体部件
        if (!bodys) {
            console.log(`[spawn] ${configName} 的 body 组装失败`)
            // 直接移除该任务
            return <OK>0
        } 
        const spawnResult: ScreepsReturnCode = this.spawnCreep(bodys, configName, {
            memory: creepMemory
        })
        // 检查是否生成成功
        if (spawnResult == OK) {
            // console.log(`${creepConfig.spawn} 正在生成 ${configName} ...`)
            delete this.room.memory.allStructureFillEnergy
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
     * 房间断供检查
     * 此方法用于检查房间是否已经无法持续提供能量用于 spawn
     * 
     * 通过检查 spawnList 中是否有 importentRoles 来判断
     * 一旦有 importentRoles 因为能量不足无法重生，则表明房间将在不久之后断供
     */
    private noCreepSave(): void {
        // 遍历生产队列中的所有任务名(creep名)
        for (const index in this.memory.spawnList) {
            const spawnTask = this.memory.spawnList[index]
            // 将任务名和重要角色名比较
            for (const importantRole of importantRoles) {
                if (spawnTask.indexOf(importantRole) !== -1) {
                    console.log(`[断供警告] ${this.room.name} 即将生成最小化 ${spawnTask}`)
                    // 是重要角色的话则以最小身体生成
                    if (this.mySpawnCreep(spawnTask, true) === OK) this.memory.spawnList.splice(Number(index), 1)
                    // 只生成一个
                    return
                }
            }
        }
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
        if (this.store[RESOURCE_ENERGY] <= repairSetting.energyLimit) return false

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
        // 冷却好了 能量不为空
        if (this.energy > 0 && this.cooldown == 0) {
            if (!this.room.memory.links) this.room.memory.links = {}
            // 读配置项
            const linkWorkFunctionName: string = this.room.memory.links[this.id]
            if (!linkWorkFunctionName) return console.log(`[空闲 link] 请为 ${this.id} 分配角色`)
            
            if (this[linkWorkFunctionName]) this[linkWorkFunctionName]()
        }
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
    getNeedResource(target: ResourceConstant): boolean {
        const componentResources = COMMODITIES[target].components
        for (const component in componentResources) {
            // 如果自己存储里该资源的数量不足，则发布任务
            if (this.store[component] < componentResources[component]) {
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
            console.log('够了！')
            const cost = Game.market.calcTransactionCost(task.amount, this.room.name, task.target)
            
            // 如果要转移能量就需要对路费是否足够的判断条件进行下特殊处理
            const costCondition = (task.resourceType === RESOURCE_ENERGY) ?
                this.store[RESOURCE_ENERGY] - task.amount < cost :
                this.store[RESOURCE_ENERGY] < cost

            // 如果路费不够的话就继续等
            if (costCondition) {
                // console.log('路费还是不够！', cost + task.amount)
                this.getEnergy(cost)
                return 
            }
            // console.log('路费够了！')

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
            console.log('还不够！')
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
    public dealOrder(resource: { type: ResourceConstant, amount: number }): boolean {
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
            console.log(`${this.room.name} 交易成功! 资源: ${targetOrder.resourceType} 类型: ${targetOrder.type} 数量: ${amount} 单价: ${targetOrder.price}`)
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
    public ResourceListener(resource: { type: ResourceConstant, amount: number }): void {
        if (this.store[resource.type] == resource.amount) {
            // console.log(`${resource.type} 数量刚刚好`)
            this.setNextIndex()
            return
        }

        // 获取订单
        const targetOrder = this.getOrder({
            // 根据存储的数量是否超过上限来决定是买单还是卖单
            type: (this.store[resource.type] > resource.amount) ? ORDER_BUY : ORDER_SELL,
            resourceType: resource.type
        })
        if (!targetOrder) {
            console.log(`${this.room.name} 没有为 ${resource.type} 找到合适的订单`)
            this.setNextIndex()
            return
        }
        
        console.log(`${this.room.name} 为 ${targetOrder.resourceType} 找到了一个合适的订单 类型: ${targetOrder.type} 单价: ${targetOrder.price}`)
        // 订单合适，写入缓存并要路费
        this.room.memory.targetOrderId = targetOrder.id
        // 计算要传输的数量
        let amount = this.store[resource.type] - resource.amount
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
    private getResourceByIndex(): { type: ResourceConstant, amount: number } | null {
        if (!this.room.memory.terminalTasks) return null
        const resources = Object.keys(this.room.memory.terminalTasks)
        if (!resources || resources.length == 0) return null
        const index = this.room.memory.terminalIndex | 0

        const resourceType = resources[index]

        return {
            type: <ResourceConstant>resourceType,
            amount: this.room.memory.terminalTasks[resourceType]
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