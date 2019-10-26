import { linkConfigs, creepConfigs, creepDefaultMemory, factoryConfigs , terminalConfigs } from './config'
import { bodyConfigs } from './setting'

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
 * @todo 矿工生成前先检查是否有矿
 */
class SpawnExtension extends StructureSpawn {
    /**
     * spawn 主要工作
     */
    public work(): void {
        // 自己已经在生成了 / 内存里没有生成队列 / 生产队列为空 就啥都不干
        if (this.spawning || !this.memory.spawnList || this.memory.spawnList.length == 0) return 
        // 进行生成
        const spawnSuccess: boolean = this.mySpawnCreep(this.memory.spawnList[0])
        // 生成成功后移除任务
        if (spawnSuccess) this.memory.spawnList.shift()
        // 失败了就检查下房间是不是危险了
        else this.noCreepSave()
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
     * 从 spawn 生产 creep
     * 
     * @param configName 对应的配置名称
     * @param minBody 用最小身体部分生成
     * @returns 开始生成返回 true, 否则返回 false
     */
    private mySpawnCreep(configName, minBody: boolean = false): boolean {
        const creepConfig = creepConfigs[configName]
        // 如果配置列表中已经找不到该 creep 的配置了 则直接移除该生成任务
        if (!creepConfig) return true

        // 设置 creep 内存
        let creepMemory: CreepMemory = _.cloneDeep(creepDefaultMemory)
        creepMemory.role = configName
        const bodys: BodyPartConstant[] = minBody ? 
            bodyConfigs[creepConfig.bodyType][1] : // 最小的身体部件
            bodyConfigs[creepConfig.bodyType][this.room.controller.level] // 符合于房间等级的身体部件
        if (!bodys) {
            console.log(`[spawn] ${configName} 的 body 组装失败`)
            return false
        } 
        const spawnResult: ScreepsReturnCode = this.spawnCreep(bodys, configName, {
            memory: creepMemory
        })
        // 检查是否生成成功
        if (spawnResult == OK) {
            // console.log(`${creepConfig.spawn} 正在生成 ${configName} ...`)
            return true
        }
        else if (spawnResult == ERR_NAME_EXISTS) {
            console.log(`${configName} 已经存在 ${creepConfig.spawn} 将不再生成 ...`)
            return true
        }
        else {
            console.log(`[生成失败] ${creepConfig.spawn} 任务 ${configName} 挂起, 错误码 ${spawnResult}`)
            return false
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
                    if (this.mySpawnCreep(spawnTask, true)) this.memory.spawnList.splice(Number(index), 1)
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
        // 先攻击敌人
        if (this.commandAttack()) { }
        // 找不到敌人再维修建筑
        else if (this.commandRepair()) { }
    }

    /**
     * 攻击指令
     * 检查本房间是否有敌人，有的话则攻击
     * 
     * @todo 缓存
     * @returns 有敌人返回 true，没敌人返回 false
     */
    public commandAttack(): boolean {
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
     * @returns 进行维修返回true，没有维修返回false
     */
    public commandRepair(): boolean {
        // 找到最近的受损建筑
        const closestDamagedStructure: AnyStructure = this.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: s => s.hits < s.hitsMax && s.structureType != STRUCTURE_RAMPART && s.structureType != STRUCTURE_WALL
        })
        // 如果有的话则进行修复
        if(closestDamagedStructure) {
            this.repair(closestDamagedStructure)
            return true
        }
        return false
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
            // 读配置项
            const linkConfig: ILinkConfig = linkConfigs[this.id]
            if (!linkConfig) return 
            // 执行配置项中的 target 方法
            linkConfig.target(this)
        }
    }

    /**
     * 传递能量的快捷方法
     */
    public to(targetId: string): void {
        this.transferEnergy(Game.getObjectById(targetId))
    }

    /**
     * 扮演中央 link
     * 
     * 向房间中的资源转移队列推送任务
     */
    public asCenter(): void {
        if (this.room.hasTask(this.id)) return 

        this.room.addTask({
            submitId: this.id,
            sourceId: this.id,
            targetId: this.room.storage.id,
            resourceType: RESOURCE_ENERGY,
            amount: this.energy
        })
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
        if (this.room.hasTask(this.id)) return 

        this.room.addTask({
            submitId: this.id,
            sourceId: this.room.storage.id,
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
        if (this.room.hasTask(this.id)) return 

        this.room.addTask({
            submitId: this.id,
            sourceId: this.id,
            targetId: this.room.terminal.id,
            resourceType: resourceType,
            amount: this.store.getUsedCapacity(resourceType)
        })
    }

    /**
     * 制作商品的快捷方式
     * @param resourceType 要制作的商品
     */
    public make(resourceType: ResourceConstant): void {
        console.log(`我要制作 ${resourceType}`)
    }
}

// Terminal 拓展
class TerminalExtension extends StructureTerminal {
    public work(): void {
        // 没有冷却好就直接跳过
        if (this.cooldown !== 0) return
        // 获取不到配置项也跳过
        const config = this.getConfig(this.room.name)
        if (!config) return
        // 自己有资源转移订单也要跳过
        if (this.room.hasTask(this.id)) return 

        // 先进行市场交易
        if (this.commandMarket(config.market)) { }
        // 之后再转移资源
        else if (this.commandTransfer(config.transferTasks)) { }
    }

    /**
     * 指令: 市场交易
     * 
     * @param config 市场交易任务
     * @returns 终端是否进入冷却
     */
    public commandMarket(config: IMarketTask): boolean {
        if (!config) return false

        // 检查资源是否足够
        if (this.store.getUsedCapacity(config.resourceType) < config.holdAmount + config.amount) return false

        let targetOrder: Order
        // 如果房间内存中没有缓存订单
        if (!this.room.memory.targetOrderId) {
            // 查找订单
            targetOrder = this.getOrder(config)
            
            // 找不到合适的订单就终止交易
            if (!targetOrder) return false
            // 找到了就写入房间内存
            else this.room.memory.targetOrderId = targetOrder.id
        }

        // 如果有缓存订单的话, 就从 id 恢复订单
        if (!targetOrder) targetOrder = Game.market.getOrderById(this.room.memory.targetOrderId)
        // 如果没找到的话说明订单失效, 移除缓存
        if (!targetOrder) {
            delete this.room.memory.targetOrderId
            return false
        }

        // 计算花销
        const cost = Game.market.calcTransactionCost(config.amount, this.room.name, targetOrder.roomName)
        // 如果没有路费的话就问 sotrage 要
        if (this.store.getUsedCapacity(RESOURCE_ENERGY) < cost) {
            this.getEngry(cost)
            console.log('要路费')
            return false
        }

        const dealResult = Game.market.deal(targetOrder.id, config.amount, this.room.name)
        // console.log(JSON.stringify(targetOrder, null, 4))
        // console.log(`订单号 ${targetOrder.id} 交易量 ${config.amount} 房间名 ${this.room.name} 返回值 ${dealResult}`)

        if (dealResult === ERR_INVALID_ARGS) {
            delete this.room.memory.targetOrderId
        }
        else if (dealResult !== OK) {
            console.log(`[终端警告] ${this.room.name} 处理订单异常 ${dealResult}`)
        }

        return true
    }

    /**
     * 指令: 资源转移
     * 
     * @param configs 传输任务列表
     * @returns 终端是否进入冷却
     */
    public commandTransfer(configs: IRoomTransferTask[]): boolean {
        if (!configs) return false
        return true
    }

    /**
     * 寻找合适的订单
     * 该方法**不会**将订单写入房间内存
     * 
     * @param config 市场交易任务
     * @returns 找到则返回订单, 否找返回 null
     */
    private getOrder(config: IMarketTask): Order | null {
        const orders = Game.market.getAllOrders(order => {
            /**
             * 注意, 这里对订单的类型做了取反
             * 这么做是因为 config 中的类型时针对房间而言的
             * 房间想要“卖出”，那么就要在市场上搜索“买入”的订单
             */
            const type = config.type === ORDER_BUY ? ORDER_SELL : ORDER_BUY
            return order.type === type && order.resourceType === config.resourceType && (order.remainingAmount >= config.amount)
        })
        // 没找到订单就返回空
        if (orders.length <= 0) return null

        // price 升序找到最适合的订单
        // 买入找price最低的 卖出找price最高的
        const sortedOrders = _.sortBy(orders, order => order.price)
        return sortedOrders[config.type === ORDER_SELL ? (sortedOrders.length - 1) : 0]
    }

    /**
     * 
     * @param amount 需要能量的数量
     */
    private getEngry(amount: number): void {
        // 发布前先检查下有没有任务
        if (this.room.hasTask(this.id)) return 

        this.room.addTask({
            submitId: this.id,
            sourceId: this.room.storage.id,
            targetId: this.id,
            resourceType: RESOURCE_ENERGY,
            amount
        })
    }

    /**
     * 从配置项列表中获取配置项
     * 
     * @param room 要获取配置的房间名
     * @returns 对应的配置项, 没找到返回 null
     */
    private getConfig(room: string): ITerminalConfig|null {
        if (terminalConfigs.hasOwnProperty(room)) {
            return terminalConfigs[room]
        }
        else return null
    }
}