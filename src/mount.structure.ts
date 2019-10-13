import { linkConfigs, orderFilter, creepConfigs, creepDefaultMemory, roomDefaultCreep } from './config'

// 挂载拓展到建筑原型
export default function () {
    _.assign(StructureSpawn.prototype, SpawnExtension.prototype)
    _.assign(StructureTower.prototype, TowerExtension.prototype)
    _.assign(StructureLink.prototype, LinkExtension.prototype)
    // _.assign(StructureTerminal.prototype, TerminalExtension.prototype)
}

// Spawn 原型拓展
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
        // 任务加入队列
        this.memory.spawnList.push(taskName)

        return this.memory.spawnList.length
    }

    /**
     * 检查生产队列中是否包含指定任务
     * 
     * @param taskName 要检查的任务名
     * @returns true/false 有/没有
     */
    public hasTask(taskName: string): boolean {
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
    private mySpawnCreep(configName, minBody: boolean=false): boolean {
        const creepConfig = creepConfigs[configName]
        // 如果配置列表中已经找不到该 creep 的配置了 则直接移除该生成任务
        if (!creepConfig) return true

        // 设置 creep 内存
        let creepMemory: CreepMemory = _.cloneDeep(creepDefaultMemory)
        creepMemory.role = configName
        const bodys: BodyPartConstant[] = minBody ? [ WORK, CARRY, MOVE] : creepConfig.bodys
        if (!bodys) {
            console.log(`${configName} 的 bodys 属性不可读`)
            return false
        } 
        const spawnResult: ScreepsReturnCode = this.spawnCreep(bodys, configName, {
            memory: creepMemory
        })
        // 检查是否生成成功
        if (spawnResult == OK) {
            console.log(`${creepConfig.spawn} 正在生成 ${configName} ...`)
            return true
        }
        else {
            console.log(`${creepConfig.spawn} 生成失败, 任务 ${configName} 挂起, 错误码 ${spawnResult}`)
            return false
        }
    }

    /**
     * 房间兜底检查
     * 检查房间内是否没有 creep 
     * 如果真没了的话则生成最小身体部件的房间默认 creep
     */
    private noCreepSave(): void {
        // 检查下房间内的 creep 是不是死完了
        if (this.room.find(FIND_MY_CREEPS).length == 0) {
            // 死完了就生成 roomDefaultCreep 中定义的默认 creep
            if (this.room.name in roomDefaultCreep) {
                this.mySpawnCreep(roomDefaultCreep[this.room.name], true)
            }
            else console.log(`房间 ${this.room.name} 没有设置默认 creep`)
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
        const enemy = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS)

        if (!enemy) return false
        this.attack(enemy)
        return true
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
            // console.log(`link ${this.id} 找到了！`)
            linkConfig.target(this)
        }
    }
}

// Terminal 拓展
class TerminalExtension extends StructureTerminal {
    public work(): void {
        const orders = Game.market.getAllOrders(orderFilter)

        console.log(JSON.stringify(orders, null, 4))
    }
}