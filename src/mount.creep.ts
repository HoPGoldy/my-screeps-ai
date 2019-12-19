import { getPath } from './utils'
import { creepConfigs } from './config'
import { repairSetting } from './setting'

// 挂载拓展到 Creep 原型
export default function () {
    _.assign(Creep.prototype, CreepExtension.prototype)
}

// 进攻旗帜的名称
const ATTACK_FLAG_NAME = 'attack'

// creep 原型拓展
class CreepExtension extends Creep {
    /**
     * creep 主要工作
     */
    public work(): void {
        // let cost1 = Game.cpu.getUsed()
        // 检查 creep 内存中的角色是否存在
        if (!(this.memory.role in creepConfigs)) {
            console.log(`${this.name} 找不到对应的 creepConfig`)
            this.say('我凉了！')
            return 
        }

        // 还没出生就啥都不干
        if (this.spawning) {
            if (this.ticksToLive === CREEP_LIFE_TIME) this._id = this.id // 解决 this creep not exist 问题
            return
        }

        // 获取对应配置项
        const creepConfig: ICreepConfig = creepConfigs[this.memory.role]

        // 没准备的时候就执行准备阶段
        if (!this.memory.ready) {
            // 有准备阶段配置则执行
            if (creepConfig.prepare) this.memory.ready = creepConfig.prepare(this)
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
        // let cost2 = Game.cpu.getUsed()
        // console.log(`[${this.name}] 消耗 ${cost2 - cost1}`)
    }

    /**
     * creep 工作状态更新
     * @param workingMsg 工作时喊的话
     * @param onStateChange 状态切换时的回调
     */
    public updateState(workingMsg: string='🧰 工作', onStateChange: Function=this.updateStateDefaultCallback): boolean {
        const resourceType: ResourceConstant = (Object.keys(this.store).length > 0) ? <ResourceConstant>Object.keys(this.store)[0] : RESOURCE_ENERGY
        const resourceAmount = this.store.getUsedCapacity(resourceType)

        // creep 身上没有能量 && creep 之前的状态为“工作”
        if(resourceAmount <= 0 && this.memory.working) {
            // 切换状态
            this.memory.working = false
            this.say('⚡ 挖矿')
            onStateChange(this, this.memory.working)
        }
        // creep 身上能量满了 && creep 之前的状态为“不工作”
        if(resourceAmount >= this.store.getCapacity() && !this.memory.working) {
            // 切换状态
            this.memory.working = true
            this.say(workingMsg)
            onStateChange(this, this.memory.working)
        }

        return this.memory.working
    }

    /**
     * 检查是否有敌人
     * 注意! 该方法只能检查有视野的房间
     * 
     * @returns {boolean} 是否有敌人
     */
    public checkEnemy(): boolean {
        // 10 ticks 检查一次
        // if (Game.time % 10) return false
        // 没有缓存则新建缓存
        if (!this.room._enemys) {
            this.room._enemys = this.room.find(FIND_HOSTILE_CREEPS)
        }

        // 如果有敌人就返回最近的那个
        if (this.room._enemys.length > 0) {
            // 取消待命状态
            this.memory.isStanBy = false
            return true
        }
        else return false
    }

    /**
     * 待命
     * 移动到 [房间名 StandBy] 旗帜的位置
     */
    public standBy(): void {
        // 如果已经在待命位置则原地不动
        if (this.memory.isStanBy) return
        // 获取旗帜
        let standByFlag = this.getFlag(`${this.name} StandBy`)
        if (!standByFlag) {
            this.say('去哪待命?')
            return
        }
        // 如果没到 就向旗帜移动
        if (!this.pos.isEqualTo(standByFlag.pos)) this.farMoveTo(standByFlag.pos)
        else this.memory.isStanBy = true
    }

    /**
     * 防御
     * 向本房间内的敌方单位发起进攻
     */
    public defense(): void {
        // 没有缓存则新建缓存
        if (!this.room._enemys) {
            this.room._enemys = this.room.find(FIND_HOSTILE_CREEPS)
        }
        // 没有敌人就啥也不干
        if (this.room._enemys.length <= 0) return

        // 从缓存中获取敌人
        const enemy = this.pos.findClosestByRange(this.room._enemys)
        this.say(`正在消灭 ${enemy.name}`)
        this.moveTo(enemy.pos, getPath('attack'))

        if (this.getActiveBodyparts(RANGED_ATTACK) > 0) this.rangedAttack(enemy)
        else this.attack(enemy)

        // 如果有可用 HEAL 身体并且掉血了则自我治疗
        if (this.getActiveBodyparts(HEAL) > 0 && this.hits < this.hitsMax) {
            this.heal(this)
        }
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
     * @param ignoreRoom 不让过的房间名数组
     * @returns 路径
     */
    public findPathInRoom(target: RoomPosition, ignoreRoom: string[] = []): PathStep[] {
        return this.pos.findPathTo(target, {
            serialize: true,
            // 房间绕路
            costCallback(roomName, costMatrix) {
                return ignoreRoom.includes(roomName) ? false : costMatrix
            }
        })
    }

    /**
     * 远距离跨房间移动
     * 该方法会在进入下个房间后使用 room.findPath 规划路径并写入缓存
     * 
     * @param target 终点的坐标
     * @param ignoreRoom 不让过的房间名数组
     * @returns creep.moveByPath 的返回值
     */
    farMoveTo(target: RoomPosition, ignoreRoom: string[] = []): 0|-1|-4|-11|-12|-5|-10 {
        // 确认目标有没有变化, 变化了则重新规划路线
        const targetPosTag = `${target.x}/${target.y}${target.roomName}`
        if (targetPosTag !== this.memory.targetPosTag) {
            this.memory.targetPosTag = targetPosTag
            this.memory.path = this.findPathInRoom(target, ignoreRoom)
        }
        // 确认缓存有没有被清除
        if (!this.memory.path) {
            this.memory.path = this.findPathInRoom(target, ignoreRoom)
            return 0
        }
        else {
            // 移动 如果移动出现问题就再次规划后重试
            // 这里导致 ERR_NOT_FOUND 的原因大多是刚移动到下一个房间
            let moveResult = this.moveByPath(this.memory.path)
            if (moveResult == ERR_NOT_FOUND) {
                this.memory.path = this.findPathInRoom(target, ignoreRoom)
                moveResult = this.moveByPath(this.memory.path)
            }
            else if (moveResult !== OK) {
                // console.log(`${this.name} 出现问题无法移动, 错误码 ${moveResult}`)
            }
            
            return moveResult
        }
    }

    /**
     * 根据指定的房间名数组进行移动
     * 
     * @param pathRooms 路径房间名数组，可以通过该参数强制指定 creep 的移动路线
     */
    farMoveByPathRooms(pathRooms: string[]) {
        // console.log('要移动的房间路径为', pathRooms)
        
        // 查找目标房间名
        let targetRoomName: string
        const currentRoomNameIndex = pathRooms.findIndex(roomName => roomName == this.room.name)
        // 到最后一个房间了
        if (currentRoomNameIndex == pathRooms.length - 1) return OK
        targetRoomName = pathRooms[currentRoomNameIndex + 1]
        console.log("TCL: CreepExtension -> farMoveByPathRooms -> targetRoomName", targetRoomName)

        // 找到出口
        const exitConstant = this.room.findExitTo(targetRoomName)
        if (exitConstant == ERR_NO_PATH || exitConstant == ERR_INVALID_ARGS) return exitConstant
        const exitPos = this.pos.findClosestByPath(exitConstant)
        console.log("TCL: CreepExtension -> farMoveByPathRooms -> this.room.find(exitConstant)", exitPos.x, exitPos.y)
        
        this.memory.path = this.findPathInRoom(exitPos)
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
        const buildResult = this.build(target)
        if (buildResult == OK) {
            // 如果修好的是 rempart 的话就移除墙壁缓存
            // 让维修单位可以快速发现新 rempart
            if (target.structureType == STRUCTURE_RAMPART) delete this.room.memory.focusWall
        }
        else if (buildResult == ERR_NOT_IN_RANGE) this.moveTo(target, getPath('build'))
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
     */
    public fillDefenseStructure(): boolean {
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
            console.log(`${this.room.name} 血量最少的墙为 ${targetWall}`)

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
        if(this.repair(targetWall) == ERR_NOT_IN_RANGE) {
            this.moveTo(targetWall, getPath('repair'))
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
        // else if (result !== OK) {
        //     this.say(`能量获取${result}`)
        // }
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
     */
    public attackFlag(): boolean {
        // 获取旗帜
        const attackFlag = this.getFlag(ATTACK_FLAG_NAME)
        if (!attackFlag) return false

        // 如果 creep 不在房间里 则一直向旗帜移动
        if (!attackFlag.room || (attackFlag.room && this.room.name !== attackFlag.room.name)) {
            this.farMoveTo(attackFlag.pos)
            return true
        }
        
        // 如果到旗帜所在房间了
        // 优先攻击 creep
        let target: Creep | PowerCreep | Structure
        const enemys = attackFlag.pos.findInRange(FIND_HOSTILE_CREEPS, 2)
        if (enemys.length > 0) target = enemys[0]
        else {
            // 没有的话再攻击 structure
            const structures = attackFlag.pos.lookFor(LOOK_STRUCTURES)
            if (structures.length == 0) {
                console.log(`${this.name} 找不到目标！`)
                return false
            }
            target = structures[0]
        }
        
        this.moveTo(target)
        const attackResult = this.attack(target)
        this.say(`冲! ${attackResult}`)

        return true
    }

    /**
     * 拆除旗帜下的建筑
     * 向 ATTACK_FLAG_NAME 发起进攻并拆除旗帜下的建筑
     */
    public dismantleFlag(): boolean {
        // 获取旗帜
        let attackFlag = this.getFlag(ATTACK_FLAG_NAME)
        if (!attackFlag) return false

        // 如果 creep 不在房间里 则一直向旗帜移动
        if (!attackFlag.room || (attackFlag.room && this.room.name !== attackFlag.room.name)) {
            this.farMoveTo(attackFlag.pos)
            return true
        }

        // 如果到旗帜所在房间了
        const structures = attackFlag.pos.lookFor(LOOK_STRUCTURES)
        if (structures.length == 0) {
            console.log(`${this.name} 找不到目标！`)
            return false
        }

        this.moveTo(structures[0])
        const result = this.dismantle(structures[0])
        this.say(`拆! ${result}`)
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
        const target = sortedHitCreeps[0]

        // 掉血就治疗
        if (target.hits < target.hitsMax) this.heal(target)
        // 远了就靠近
        if (!this.pos.isNearTo(target.pos)) this.moveTo(target)
    }

    /**
     * 检查旗帜是否存在
     * 不存在的话会在控制台给出提示
     * 
     * @param flagName 要检查的 flag 名称
     * @returns 有旗帜就返回旗帜, 否则返回 null
     */
    public getFlag(flagName: string): Flag|null {
        const flag = Game.flags[flagName]
        if (!flag) {
            console.log(`场上不存在名称为 [${flagName}] 的旗帜，请新建`)
            return null
        }
        else return flag
    }

    /**
     * updateState 方法的默认 onStateChange 回调
     * 
     * @param creep creep
     * @param working 当前是否在工作
     */
    private updateStateDefaultCallback(creep: Creep, working: boolean): void { }
}
