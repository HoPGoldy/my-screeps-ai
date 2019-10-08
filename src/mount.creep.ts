import { getPath } from './utils'
import { creepConfigs } from './config'

// 挂载拓展到 Creep 原型
export default function () {
    _.assign(Creep.prototype, CreepExtension.prototype)
}

// 占领旗帜的名称
const CLAIM_FLAG_NAME = 'claim'
// 进攻旗帜的名称
const ATTACK_FLAG_NAME = 'attack'

// creep 原型拓展
class CreepExtension extends Creep {
    /**
     * creep 主要工作
     */
    public work(): void {
        // 检查 creep 内存中的角色是否存在
        if (!(this.memory.role in creepConfigs)) {
            console.log(`creep ${this.name} 内存属性 role 不属于任何已存在的 creepConfigs 名称`)
            this.say('我凉了！')
            return 
        }
        // 获取对应配置项
        const creepConfig: ICreepConfig = creepConfigs[this.memory.role]

        // 没准备的时候就执行准备阶段
        if (!this.memory.ready) {
            // 有准备阶段配置则执行
            if (creepConfig.prepare && creepConfig.isReady) {
                creepConfig.prepare(this)
                this.memory.ready = creepConfig.isReady(this)
            }
            // 没有就直接准备完成
            else this.memory.ready = true
        }

        if (!this.memory.ready) return 

        // 获取是否工作，没有 switch 的话直接执行 target
        const working = creepConfig.switch ? creepConfig.switch(this) : true

        // 执行对应操作
        if (working) {
            if (creepConfig.target) creepConfig.target(this)
        }
        else {
            if (creepConfig.source) creepConfig.source(this)
        }

        // 如果 creep 还没有发送重生信息的话，执行健康检查
        // 健康检查不通过则向 spawnList 发送自己的生成任务
        if (!this.memory.hasSendRebirth) {
            const health: boolean = this.isHealth()
            if (!health) {
                // 向指定 spawn 推送生成任务
                Game.spawns[creepConfig.spawn].addTask(this.memory.role)
                this.memory.hasSendRebirth = true
            }
        }
    }

    /**
     * creep 工作状态更新
     * @param workingMsg 工作时喊的话
     * @param onStateChange 状态切换时的回调
     */
    public updateState(workingMsg: string='🧰 工作', onStateChange: Function=this.updateStateDefaultCallback): boolean {
        // creep 身上没有能量 && creep 之前的状态为“工作”
        if(this.carry.energy <= 0 && this.memory.working) {
            // 切换状态
            this.memory.working = false
            this.say('⚡ 挖矿')
            onStateChange(this, this.memory.working)
        }
        // creep 身上能量满了 && creep 之前的状态为“不工作”
        if(this.carry.energy >= this.carryCapacity && !this.memory.working) {
            // 切换状态
            this.memory.working = true
            this.say(workingMsg)
            onStateChange(this, this.memory.working)
        }
    
        return this.memory.working
    }

    /**
     * 检查是否有敌人
     * 注意! 该方法只能检查自己控制的房间
     * 
     * @returns {boolean} 是否有敌人
     */
    public checkEnemy(): boolean {
        // 从雷达扫描结果中获取敌人
        const enemys: Creep|undefined = Memory[this.room.name].radarResult.enemys
        // 如果有敌人就返回最近的那个
        return enemys ? true : false
    }

    /**
     * 待命
     * 移动到 [房间名 StandBy] 旗帜的位置
     */
    public standBy(): void {
        const standByFlag: Flag = Game.flags[`${this.room.name} StandBy`]
        if (standByFlag) this.moveTo(standByFlag, getPath())
        else this.say(`找不到 [${this.room.name} StandBy] 旗帜`)
    }

    /**
     * 防御
     * 向雷达扫描到的敌方单位发起进攻
     */
    public defense(): void {
        // 从雷达扫描结果中获取敌人
        const enemys: Creep[] = Memory[this.room.name].radarResult.enemys
        const enemy = this.pos.findClosestByRange(enemys)
        this.say(`正在消灭 ${enemy.name}`)
        this.moveTo(enemy.pos, getPath('attack'))
        this.attack(enemy)
    }

    /**
     * 填充本房间内所有 spawn 和 extension 
     * 
     * @param backupStorageId 在能量填满后应该把能量往哪里存
     */
    public fillSpawnEngry(backupStorageId: string=''): boolean {
        let target: AnyStructure = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s => (s.structureType == STRUCTURE_EXTENSION ||
                s.structureType == STRUCTURE_SPAWN) && 
                (s.energy < s.energyCapacity)
        })
        // 能量都已经填满
        if (!target) {
            target = Game.getObjectById(backupStorageId)
            if (!target) return false
        }

        this.transferTo(target, RESOURCE_ENERGY)
        return true
    }

    /**
     * 查找到目标的路径并返回
     * 
     * @param target 目标的位置
     * @returns 路径
     */
    public findPathInRoom(target: RoomPosition): PathStep[] {
        return this.pos.findPathTo(target, {
            ignoreCreeps: true,
            serialize: true
        })
    }

    /**
     * 远距离跨房间移动
     * 该方法会在进入下个房间后使用 room.findPath 规划路径并写入缓存
     * 
     * @param target 终点的坐标
     * @returns creep.moveByPath 的返回值
     */
    farMoveTo(target: RoomPosition): 0|-1|-4|-11|-12|-5|-10 {
        if (!this.memory.path) {
            this.memory.path = this.findPathInRoom(target)
            // this.say('已重新规划路径')
            return 0
        }
        else {
            // 移动 如果移动出现问题就再次规划后重试
            // 这里导致 ERR_NOT_FOUND 的原因大多是刚移动到下一个房间
            let moveResult = this.moveByPath(this.memory.path)
            if (moveResult == ERR_NOT_FOUND) {
                this.memory.path = this.findPathInRoom(target)
                moveResult = this.moveByPath(this.memory.path)
            }
            
            return moveResult
        }
    }

    /**
     * 填充本房间内所有 tower
     */
    public fillTower(): boolean {
        const target: AnyStructure = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s => s.structureType == STRUCTURE_TOWER && s.energy < s.energyCapacity
        })
        // 能量都已经填满
        if (!target) return false

        this.transferTo(target, RESOURCE_ENERGY)
        return true
    }

    /**
     * 填充本房间的 controller
     */
    public upgrade(): boolean {
        if(this.upgradeController(this.room.controller) == ERR_NOT_IN_RANGE) {
            this.moveTo(this.room.controller, getPath('upgrade'))
        }
        return true
    }

    /**
     * 给本房间签名
     * 
     * @param content 签名内容
     */
    public sign(content: string): void {
        if (this.signController(this.room.controller, content) == ERR_NOT_IN_RANGE) {
            this.moveTo(this.room.controller)
        }
    }

    /**
     * 建设房间内存在的建筑工地
     */
    public buildStructure(): boolean {
        // 新建目标建筑工地
        let target: ConstructionSite | null = null
        // 检查是否有缓存
        if (this.memory.constructionSiteId) {
            target = Game.getObjectById(this.memory.constructionSiteId)
            // 如果缓存中的工地不存在则获取下一个
            if (!target) target = this._updateConstructionSite()
        }
        // 没缓存就直接获取
        else target = this._updateConstructionSite()
        if (!target) return false
        
        // 建设
        if (this.build(target) == ERR_NOT_IN_RANGE) this.moveTo(target, getPath('build'))
        return true
    }

    /**
     * 获取下一个建筑工地
     * 有的话将其 id 写入自己 memory.constructionSiteId
     * 
     * @returns 下一个建筑工地，或者 null
     */
    private _updateConstructionSite(): ConstructionSite|null {
        const targets: ConstructionSite[] = this.room.find(FIND_MY_CONSTRUCTION_SITES)
        if (targets.length > 0) {
            this.memory.constructionSiteId = targets[0].id
            return targets[0]
        }
        else return null
    }

    /**
     * 移动到指定房间
     * 
     * @param roomName 要支援的房间名称
     */
    public moveToRoom(roomName: string): boolean {
        if (this.room.name !== roomName) {
            const targetPos = new RoomPosition(25, 25, roomName)
            this.moveTo(targetPos, getPath())

            return false
        }

        return true
    }

    /**
     * 维修房间内受损的建筑
     * 不会维修 wall 和 rempart
     */
    public repairStructure(): boolean {
        let target = this.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: s => (s.hits < s.hitsMax) && (s.structureType != STRUCTURE_RAMPART) && (s.structureType != STRUCTURE_WALL)
        })
        if (!target) return false
    
        // 修复结构实现
        if(this.repair(target) == ERR_NOT_IN_RANGE) {
            this.moveTo(target, getPath('repair'))
        }
        return true
    }

    /**
     * 填充防御性建筑
     * 包括 wall 和 rempart
     * 
     * @param expectHits 期望生命值 (大于该生命值的建筑将不会被继续填充)
     */
    public fillDefenseStructure(expectHits: number=5000): boolean {
        // 检查自己内存里有没有期望生命值
        if (!this.memory.expectHits) this.memory.expectHits = expectHits

        // 先筛选出来所有的防御建筑
        const defenseStructures: Structure[] = this.room.find(FIND_STRUCTURES, {
            filter: s => (s.hits < s.hitsMax) && 
                (s.structureType == STRUCTURE_WALL ||
                s.structureType == STRUCTURE_RAMPART)
        })
        if (defenseStructures.length <= 0) {
            this.say('找不到墙！')
            return false
        }

        //获取缓存中的墙
        let target: Structure = Game.getObjectById(this.memory.fillWallId)
        // 如果有血量只有1的墙的话优先处理 并将期望重设为初始值
        const newDefenseStructures: Structure[] = _.filter(defenseStructures, s => s.hits == 1)
        if (newDefenseStructures.length > 0) {
            this.say('发现新墙，来了')
            target = newDefenseStructures[0]
            this.memory.fillWallId = target.id
            this.memory.expectHits = expectHits
        }

        if (!target || target.hits > this.memory.expectHits) {
            // 再检查哪个墙的血量不够
            let targets = _.filter(defenseStructures, s => s.hits < this.memory.expectHits)
            while (targets.length <= 0) {
                // 如果当前期望血量下没有满足添加的墙时，提高期望再次查找 
                this.memory.expectHits += expectHits
                targets = _.filter(defenseStructures, s => s.hits < this.memory.expectHits)

                // 做一个兜底 防止死循环
                if (this.memory.expectHits >= WALL_HITS_MAX) break
            }
            
            // 还是没找到墙的话就返回吧
            if (targets.length <= 0) return false
            else {
                target = targets[0]
                this.memory.fillWallId = target.id
            }
        }
        
        // 填充结构
        if(this.repair(target) == ERR_NOT_IN_RANGE) {
            this.moveTo(target, getPath('repair'))
        }
        return true
    }

    /**
     * 占领指定房间
     * 要占领的房间由名称为 CLAIM_FLAG_NAME 的旗帜指定
     */
    public claim(): boolean {
        const claimFlag = Game.flags[CLAIM_FLAG_NAME]
        if (!claimFlag) {
            console.log(`场上不存在名称为 [${CLAIM_FLAG_NAME}] 的旗帜，请新建`)
            return false
        }
        this.moveTo(claimFlag, getPath('claimer'))
        const room = claimFlag.room
        if (room && this.claimController(room.controller) == ERR_NOT_IN_RANGE) {
            this.moveTo(room.controller, getPath('claimer'))
            return false
        }
        return true
    }

    /**
     * 从目标结构获取能量
     * 
     * @param target 提供能量的结构
     * @returns 执行 harvest 或 withdraw 后的返回值
     */
    public getEngryFrom(target: Structure|Source): ScreepsReturnCode {
        let result: ScreepsReturnCode
        // 是建筑就用 withdraw
        if ('structureType' in target) result = this.withdraw(target as Structure, RESOURCE_ENERGY)
        // 不是的话就用 harvest
        else result = this.harvest(target as Source)

        if (result == ERR_NOT_IN_RANGE) {
            this.moveTo(target, getPath())
        }
        return result
    }

    /**
     * 转移资源到结构
     * 
     * @param target 要转移到的目标
     * @param RESOURCE 要转移的资源类型
     */
    public transferTo(target: Structure, RESOURCE: ResourceConstant): ScreepsReturnCode {
        // 转移能量实现
        const result: ScreepsReturnCode = this.transfer(target, RESOURCE)
        if (result == ERR_NOT_IN_RANGE) {
            this.moveTo(target, getPath())
        }
        return result
    }

    /**
     * 进攻
     * 向 ATTACK_FLAG_NAME 旗帜发起进攻
     *
     * @todo 进攻敌方 creep
     */
    public attackFlag() {
        let attackFlag = Game.flags[ATTACK_FLAG_NAME]
        if (!attackFlag) {
            console.log(`没有名为 ${ATTACK_FLAG_NAME} 的旗子`)
            return false
        }

        // 一直向旗帜移动
        this.moveTo(attackFlag.pos, getPath('attack'))
        // 如果到旗帜所在房间了
        if (attackFlag.room) {
            const targets = attackFlag.pos.lookFor(LOOK_STRUCTURES)
            if (targets.length == 0) {
                console.log(`${this.name} 找不到目标！`)
                return false
            }
            const attackResult = this.attack(targets[0])
            console.log(`${this.name} 正在攻击 ${targets[0].structureType}, 返回值 ${attackResult}`)
        }
        return true
    }

    /**
     * 治疗指定目标
     * 比较给定目标生命(包括自己)生命损失的百分比, 谁血最低治疗谁
     * @param creeps 要治疗的目标们
     */
    public healTo(creeps: Creep[]): void {
        creeps.push(this)
        // 生命值损失比例从大到小排序
        let sortedHitCreeps = creeps.sort((a, b) => (a.hits / a.hitsMax) - (b.hits / b.hitsMax))
        this.heal(sortedHitCreeps[0])
    }

    /**
     * creep 健康检查, 条件如下:
     *   1. 剩余时间小于10
     *   2. 生命值低于一半
     * 
     * @returns {boolean} 健康就返回 true, 不健康返回 false
     */
    public isHealth(): boolean {
        if (this.ticksToLive <= 10 || this.hits < this.hitsMax / 2) return false
        else return true
    }

    /**
     * updateState 方法的默认 onStateChange 回调
     * 
     * @param creep creep
     * @param working 当前是否在工作
     */
    private updateStateDefaultCallback(creep: Creep, working: boolean): void { }
}
