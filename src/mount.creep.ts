/**
 * Creep 原型拓展
 * 为每个 creep 添加的工作方法
 */
export default function () {
    _.assign(Creep.prototype, creepExtension)
}

// 进攻旗帜的名称
const ATTACK_FLAG_NAME = 'a'
// 占领旗帜的名称
const CLAIM_FLAG_NAME = 'claim'

const creepExtension = {
    /**
     * 维护单位工作状态更新
     * @param workingMsg 工作时喊的话
     * @param onStateChange 状态切换时的回调
     */
    updateState(workingMsg: string='🧰 工作', onStateChange: Function=updateStateDefaultCallback): boolean {
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
    },

    /**
     * 检查是否有敌人
     * 注意! 该方法只能检查自己控制的房间
     * 
     * @returns {boolean} 是否有敌人
     */
    checkEnemy() {
        // 从雷达扫描结果中获取敌人
        const enemys = Memory[this.room.name].radarResult.enemys
        // 如果有敌人就返回最近的那个
        return enemys ? true : false
    },

    /**
     * 待命
     * 移动到 [房间名 StandBy] 旗帜的位置
     */
    standBy() {
        const standByFlag = Game.flags[`${this.room.name} StandBy`]
        if (standByFlag) this.moveTo(standByFlag)
        else this.say(`找不到 [${this.room.name} StandBy] 旗帜`)
    },

    /**
     * 防御
     * 向雷达扫描到的敌方单位发起进攻
     */
    defense() {
        // 从雷达扫描结果中获取敌人
        const enemys = Memory[this.room.name].radarResult.enemys
        const enemy = this.pos.findClosestByRange(enemys)
        this.say(`正在消灭 ${enemy.name}`)
        this.moveTo(enemy.pos)
        this.attack(enemy)
    },

    /**
     * 填充本房间内所有 spawn 和 extension 
     */
    fillSpawnEngry() {
        let target: StructureExtension|StructureSpawn|undefined = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s => (s.structureType == STRUCTURE_EXTENSION ||
                s.structureType == STRUCTURE_SPAWN) && 
                (s.energy < s.energyCapacity)
        })
        // 能量都已经填满
        if (!target) return false

        this.transferTo(target, RESOURCE_ENERGY)
        return true
    },

    /**
     * 填充本房间内所有 tower
     */
    fillTower() {
        const target: StructureTower|undefined = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s => s.structureType == STRUCTURE_TOWER && 
                s.energy < s.energyCapacity
        })
        // 能量都已经填满
        if (!target) {
            // 没事干就去填 spawn
            this.buildStructure(target, RESOURCE_ENERGY)
            return false
        }

        return true
    },

    /**
     * 填充本房间的 controller
     */
    upgrade() {
        if(this.upgradeController(this.room.controller) == ERR_NOT_IN_RANGE) {
            this.moveTo(this.room.controller)
        }
    },

    /**
     * 建设房间内存在的建筑工地
     */
    buildStructure() {
        const targets: StructureConstructor = this.room.find(FIND_CONSTRUCTION_SITES)
        // 找到就去建造
        if (targets.length > 0) {
            if(this.build(targets[0]) == ERR_NOT_IN_RANGE) {
                this.moveTo(targets[0])
            }
            return true
        }
        else {
            // 没事干就去升级控制器
            this.upgrade()
            return false
        }
    },

    /**
     * 移动到指定房间
     * 
     * @param roomName 要支援的房间名称
     */
    supportTo(roomName: string): boolean {
        if (this.room.name !== roomName) {
            const targetPos = new RoomPosition(25, 25, roomName)
            this.moveTo(targetPos)

            return false
        }

        return true
    },

    /**
     * 维修房间内受损的建筑
     * @todo 功能拆分
     * 
     * 优先修复房间结构，都修好的话再去修 wall 和 rempart
     */
    repairStructure() {
        let target = this.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: s => {            
                return s.hits < (s.hitsMax) &&
                       s.structureType != STRUCTURE_WALL &&
                       s.structureType != STRUCTURE_RAMPART
            }
        })
        
        if (!target) {
            target = this.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: s => {
                    return s.hits < (s.hitsMax / 0.5) &&
                           s.structureType == STRUCTURE_WALL &&
                           s.structureType == STRUCTURE_RAMPART
                }
            })
        }
    
        // 修复结构实现
        if(this.repair(target) == ERR_NOT_IN_RANGE) {
            this.moveTo(target)
        }
    },

    /**
     * 占领指定房间
     * 要占领的房间由名称为 CLAIM_FLAG_NAME 的旗帜指定
     */
    claim(): boolean {
        const claimFlag = Game.flags[CLAIM_FLAG_NAME]
        if (!claimFlag) {
            console.log(`场上不存在名称为 [${CLAIM_FLAG_NAME}] 的旗帜，请新建`)
        }
        this.moveTo(claimFlag)
        const room = claimFlag.room
        if (room && this.claimController(room.controller) == ERR_NOT_IN_RANGE) {
            this.moveTo(room.controller)
            return false
        }
        return true
    },

    /**
     * 从目标结构获取资源
     * 
     * @param target 提供资源的结构
     * @param getFunc 获取资源使用的方法名，必须是 Creep 原型上的，例如"harvest", "withdraw"
     * @param args 传递给上面方法的剩余参数列表
     */
    getEngryFrom(target: Structure, getFunc: string, ...args: any[]): void {
        if (this[getFunc](target, ...args) == ERR_NOT_IN_RANGE) {
            this.moveTo(target)
        }
    },

    /**
     * 转移资源到结构
     * 
     * @param target 要转移到的目标
     * @param RESOURCE 要转移的资源类型
     */
    transferTo(target: Structure, RESOURCE: ResourceConstant): void {
        // 转移能量实现
        if(this.transfer(target, RESOURCE) == ERR_NOT_IN_RANGE) {
            this.moveTo(target)
        }
    },

    /**
     * 通过 id 获取对象
     * @param id 游戏中的对象id
     */
    getObjectById<T>(id: string|undefined): T|null {
        return Game.getObjectById(id)
    },

    /**
     * 进攻
     * 向 ATTACK_FLAG_NAME + memory.squad 旗帜发起冲锋
     * 如果有 ATTACK_FLAG_NAME 旗帜，则优先进行响应
     *
     * @todo 进攻敌方 creep
     */
    attackFlag() {
        let attackFlag = Game.flags[ATTACK_FLAG_NAME]

        if (!attackFlag) {
            console.log(`没有名为 ${ATTACK_FLAG_NAME} 的旗子`)
            return false
        }

        this.moveTo(attackFlag.pos)
        if (attackFlag.room) {
            const targets = attackFlag.getStructureByFlag()
            const attackResult = this.attack(targets[0])
            console.log(`${this.name} 正在攻击 ${targets[0].structureType}, 返回值 ${attackResult}`)
        }
    },

    /**
     * 治疗指定目标
     * 比较给定目标生命(包括自己)生命损失的百分比, 谁血最低治疗谁
     * @param creeps 要治疗的目标们
     */
    healTo(creeps: Creep[]) {
        creeps.push(this)
        // 生命值损失比例从大到小排序
        let sortedHitCreeps = creeps.sort((a, b) => (a.hits / a.hitsMax) - (b.hits / b.hitsMax))
        this.heal(sortedHitCreeps[0])
    }
}

/**
 * updateState 方法的默认 onStateChange 回调
 * 
 * @param creep creep
 * @param working 当前是否在工作
 */
function updateStateDefaultCallback(creep: Creep, working: boolean): void { }