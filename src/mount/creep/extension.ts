import { repairSetting, minWallHits } from 'setting'
import roles from 'role'
import { goTo, setWayPoint } from 'modules/move'
import { getMemoryFromCrossShard } from 'modules/crossShard'
import { useCache } from 'utils'
import { buildCompleteSite, getNearSite } from 'modules/constructionController'

// creep 原型拓展
export default class CreepExtension extends Creep {
    /**
     * creep 主要工作
     */
    public onWork(): void {
        // 检查 creep 内存中的角色是否存在
        if (!(this.memory.role in roles)) {
            // 没有的话可能是放在跨 shard 暂存区了
            const memory = getMemoryFromCrossShard(this.name)
            // console.log(`${this.name} 从暂存区获取了内存`, memory)
            if (!memory) {
                this.log(`找不到对应的 creepConfig`, 'yellow')
                this.say('我凉了！')
                return
            }
        }

        // 还没出生就啥都不干
        if (this.spawning) return

        // 获取对应配置项
        const creepConfig: CreepConfig<CreepRoleConstant> = roles[this.memory.role]

        // 没准备的时候就执行准备阶段
        if (!this.memory.ready) {
            // 有准备阶段配置则执行
            if (creepConfig.prepare) this.memory.ready = creepConfig.prepare(this as MyCreep)
            // 没有就直接准备完成
            else this.memory.ready = true
        }

        //　如果执行了 prepare 还没有 ready，就返回等下个 tick 再执行
        if (!this.memory.ready) return 

        // 获取是否工作，没有 source 的话直接执行 target
        const working = creepConfig.source ? this.memory.working : true

        let stateChange = false
        // 执行对应阶段
        // 阶段执行结果返回 true 就说明需要更换 working 状态
        if (working) {
            if (creepConfig.target && creepConfig.target(this as MyCreep)) stateChange = true
        }
        else {
            if (creepConfig.source && creepConfig.source(this as MyCreep)) stateChange = true
        }

        // 状态变化了就释放工作位置
        if (stateChange) {
            this.memory.working = !this.memory.working
            if (this.memory.stand) delete this.memory.stand
        }
    }

    /**
     * 发送日志
     * 
     * @param content 日志内容
     * @param instanceName 发送日志的实例名
     * @param color 日志前缀颜色
     * @param notify 是否发送邮件
     */
    log(content: string, color: Colors = undefined, notify: boolean = false): void {
        this.room.log(content, this.name, color, notify)
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
        if (!this.pos.isEqualTo(standByFlag.pos)) this.goTo(standByFlag.pos, {
            checkTarget: true,
            range: 0
        })
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
        this.moveTo(enemy.pos)

        if (this.getActiveBodyparts(RANGED_ATTACK) > 0) this.rangedAttack(enemy)
        else this.attack(enemy)

        // 如果有可用 HEAL 身体并且掉血了则自我治疗
        if (this.getActiveBodyparts(HEAL) > 0 && this.hits < this.hitsMax) {
            this.heal(this)
        }
    }

    /**
     * 无视 Creep 的寻路
     * 
     * @param target 要移动到的位置
     */
    public goTo(target?: RoomPosition, moveOpt?: MoveOpt): ScreepsReturnCode {
        return goTo(this, target, moveOpt)
    }

    /**
     * 设置路径点
     * 
     * @see doc/移动及寻路设计案
     * @param target 要进行设置的目标，位置字符串数组或者是路径名前缀
     */
    public setWayPoint(target: string[] | string): ScreepsReturnCode {
        return setWayPoint(this, target)
    }

    /**
     * 填充本房间的 controller
     */
    public upgrade(): ScreepsReturnCode {
        const result = this.upgradeController(this.room.controller)

        if (result == ERR_NOT_IN_RANGE) {
            this.goTo(this.room.controller.pos)
        }
        return result
    }

    /**
     * 建设房间内存在的建筑工地
     * 
     * @param targetConstruction 要建造的目标工地，该参数无效的话将自行挑选工地
     */
    public buildStructure(targetConstruction?: ConstructionSite): CreepActionReturnCode | ERR_NOT_ENOUGH_RESOURCES | ERR_RCL_NOT_ENOUGH | ERR_NOT_FOUND {
        // 新建目标建筑工地
        const target = this.getBuildTarget(targetConstruction)

        if (!target) return ERR_NOT_FOUND
        // 上面发现有墙要刷了，这个 tick 就不再造建造了
        // 防止出现造好一个 rampart，然后直接造下一个 rampart，造好后又扭头去刷第一个 rampart 的小问题出现
        if (this.memory.fillWallId) return ERR_BUSY

        // 建设
        const buildResult = this.build(target)
        if (buildResult == OK) {
            // 如果修好的是 rempart 的话就移除墙壁缓存
            // 让维修单位可以快速发现新 rempart
            if (target.structureType == STRUCTURE_RAMPART) delete this.room.memory.focusWall
        }
        else if (buildResult == ERR_NOT_IN_RANGE) this.goTo(target.pos)
        return buildResult
    }

    /**
     * 建筑目标获取
     * 优先级：指定的目标 > 自己保存的目标 > 房间内保存的目标
     */
    private getBuildTarget(target?: ConstructionSite): ConstructionSite | undefined {
        // 指定了目标，直接用，并且把 id 备份一下
        if (target) {
            this.memory.constructionSiteId = target.id
            return target
        }
        // 没有指定目标，或者指定的目标消失了，从本地内存查找
        else {
            const selfKeepTarget = Game.getObjectById(this.memory.constructionSiteId)
            if (selfKeepTarget) return selfKeepTarget
            // 本地内存里保存的 id 找不到工地了，检查下是不是造好了
            else {
                const structure = buildCompleteSite[this.memory.constructionSiteId]

                // 如果刚修好的是墙的话就记住该墙的 id，然后把血量刷高一点）
                if (structure && (
                    structure.structureType === STRUCTURE_WALL ||
                    structure.structureType === STRUCTURE_RAMPART
                )) {
                    this.memory.fillWallId = structure.id as Id<StructureWall | StructureRampart>
                }

                delete this.memory.constructionSiteId
            }
        }

        // 自己内存里没找到，去房间内存里查找，房间内存没有的话就搜索并缓存到房间
        const roomKeepTarget = Game.getObjectById(this.room.memory.constructionSiteId)
            || useCache(() => getNearSite(this.pos), this.room.memory, 'constructionSiteId')

        // 找到了，保存到自己内存里
        if (roomKeepTarget) {
            this.memory.constructionSiteId = this.room.memory.constructionSiteId
            return roomKeepTarget
        }
        else delete this.room.memory.constructionSiteId

        return undefined
    }

    /**
     * 稳定新墙
     * 会把内存中 fillWallId 标注的墙声明值刷到定值以上
     */
    public steadyWall(): OK | ERR_NOT_FOUND {
        const wall = Game.getObjectById(this.memory.fillWallId)
        if (!wall) return ERR_NOT_FOUND

        if (wall.hits < minWallHits) {
            const result = this.repair(wall)
            if (result == ERR_NOT_IN_RANGE) this.goTo(wall.pos)
        }
        else delete this.memory.fillWallId

        return OK
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
            const walls = [...this.room[STRUCTURE_WALL], ...this.room[STRUCTURE_RAMPART]].filter(s => s.hits < s.hitsMax)

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
        const result = this.repair(targetWall)
        if (result == ERR_NOT_IN_RANGE) this.goTo(targetWall.pos)
        return true
    }

    /**
     * 从目标结构获取能量
     * 
     * @param target 提供能量的结构
     * @returns 执行 harvest 或 withdraw 后的返回值
     */
    public getEngryFrom(target: AllEnergySource): ScreepsReturnCode {
        let result: ScreepsReturnCode
        // 是建筑就用 withdraw
        if (target instanceof Structure) {
            // 如果建筑里没能量了就不去了，防止出现粘性
            if (target.store[RESOURCE_ENERGY] <= 0) return ERR_NOT_ENOUGH_ENERGY
            result = this.withdraw(target as Structure, RESOURCE_ENERGY)
        }
        else if (target instanceof Resource) result = this.pickup(target as Resource)
        // 不是的话就用 harvest
        else result = this.harvest(target as Source)

        if (result === ERR_NOT_IN_RANGE) this.goTo(target.pos, { range: 1, checkTarget: true })

        return result
    }

    /**
     * 转移资源到建筑
     * 包含移动逻辑
     * 
     * @param target 要转移到的目标
     * @param RESOURCE 要转移的资源类型
     */
    public transferTo(target: Structure, RESOURCE: ResourceConstant, moveOpt: MoveOpt = {}): ScreepsReturnCode {
        this.goTo(target.pos, moveOpt)
        return this.transfer(target, RESOURCE)
    }

    /**
     * 进攻
     * 向指定旗帜旗帜发起进攻
     * 
     * @param flagName 要进攻的旗帜名称
     */
    public attackFlag(flagName: string): boolean {
        this.say('💢', true)
        // 获取旗帜
        const attackFlag = this.getFlag(flagName)
        if (!attackFlag) return false

        // 如果 creep 不在房间里 则一直向旗帜移动
        if (!attackFlag.room || (attackFlag.room && this.room.name !== attackFlag.room.name)) {
            this.goTo(attackFlag.pos, {
                checkTarget: true
            })
            return true
        }
        
        // 如果到旗帜所在房间了
        // 优先攻击 creep
        let target: Creep | PowerCreep | Structure | Flag
        const enemys = attackFlag.pos.findInRange(FIND_HOSTILE_CREEPS, 2)
        if (enemys.length > 0) target = enemys[0]
        else {
            // 没有的话再攻击 structure
            const structures = attackFlag.pos.lookFor(LOOK_STRUCTURES)
            if (structures.length === 0) {
                this.say('干谁？')
                target = attackFlag
            }
            else target = structures[0]
        }
        
        this.moveTo(target)
        this.attack(target as Creep)

        return true
    }

    /**
     * 使用 range_attack 进攻旗帜
     * 整合了 heal 逻辑
     * 
     * @param flagName 要进攻的旗帜名称
     */
    public rangedAttackFlag(flagName: string): boolean {
        // 获取旗帜
        const attackFlag = this.getFlag(flagName)
        if (!attackFlag) return false

        // 根据 massMode 选择不同给攻击模式
        if (this.memory.massMode) this.rangedMassAttack()
        else {
            const structures = attackFlag.pos.lookFor(LOOK_STRUCTURES)
            if (structures.length > 0) this.rangedAttack(structures[0])
        }

        // 治疗自己，不会检查自己生命值，一直治疗
        // 因为本 tick 受到的伤害只有在下个 tick 才能发现，两个 tick 累计的伤害足以击穿 tough。
        if (this.getActiveBodyparts(HEAL)) this.heal(this)
 
        // 无脑移动
        this.moveTo(attackFlag)
    }

    /**
     * 切换 RANGE_ATTACK 的攻击模式 (switch mass mode)
     */
    public smass(): string {
        if (this.memory.massMode) {
            delete this.memory.massMode
            return `MassAttack [OFF]`
        }
        else {
            this.memory.massMode = true
            return `MassAttack [ON]`
        }
    }

    /**
     * 拆除旗帜下的建筑
     * 向指定旗帜发起进攻并拆除旗帜下的建筑
     * 
     * @param flagName 要进攻的旗帜名称
     */
    public dismantleFlag(flagName: string, healerName: string = ''): boolean {
        // 获取旗帜
        let attackFlag = this.getFlag(flagName)
        if (!attackFlag) return false
        // 治疗单位
        const healer = Game.creeps[healerName]

        // 如果 creep 不在房间里 则一直向旗帜移动
        if (!attackFlag.room || (attackFlag.room && this.room.name !== attackFlag.room.name)) {
            // 如果 healer 存在则只会在 healer 相邻且可以移动时才进行移动
            if (!healer || (healer && this.canMoveWith(healer))) this.goTo(attackFlag.pos, {
                checkTarget: true
            })
            return true
        }

        // 如果到旗帜所在房间了
        const structures = attackFlag.pos.lookFor(LOOK_STRUCTURES)
        if (structures.length == 0) this.say('干谁?')
        
        // healer 不存在（自己行动）或者 healer 可以和自己同时移动时才允许自己移动
        if (!healer || (healer && this.canMoveWith(healer))) {
            this.moveTo(attackFlag)
            
            // 如果之前在拆墙则移除刚才所在的禁止通行点位
            if (this.memory.stand) delete this.memory.stand
        }

        const result = this.dismantle(structures[0])
    }

    /**
     * 是否可以和指定 Creep 一起移动
     * 并不会执行移动，本方法只是进行查询，返回 true 时说明当前两者状态可以一起移动
     * 当目标 creep 不存在时本方法将永远返回 false
     * 
     * @param creep 要一起移动的 creep
     * @returns 可以移动时返回 true，否则返回 false
     */
    private canMoveWith(creep: Creep): boolean {
        if (creep && this.pos.isNearTo(creep) && creep.fatigue === 0) return true
        return false
    }

    /**
     * 治疗指定目标
     * 比较给定目标生命(包括自己)生命损失的百分比, 谁血最低治疗谁
     * @param creep 要治疗的目标
     */
    public healTo(creep: Creep): void {
        if (!creep) {
            this.heal(this)
            return
        }

        // 获取治疗目标，目标生命值损失大于等于自己的话，就治疗目标
        // 否则治疗自己
        let target: Creep = null
        if ((creep.hitsMax - creep.hits) >= (this.hitsMax - this.hits)) target = creep
        else target = this

        // 进行治疗，如果失败就远程治疗
        const healResult = this.heal(target)
        if (healResult == ERR_NOT_IN_RANGE) this.rangedHeal(target)

        // 一直朝着目标移动，在友方领土上移动时会无视 creep
        if (!this.room.controller || !this.room.controller.owner || this.room.controller.owner.username !== this.owner.username) this.moveTo(creep)
        else this.goTo(creep.pos)
        
        // 检查自己是不是在骑墙
        if (this.onEnter()) {
            const safePosFinder = i => i !== 0 && i !== 49
            // 遍历找到目标 creep 身边的不骑墙位置
            const x = [creep.pos.x - 1, creep.pos.x + 1].find(safePosFinder)
            const y = [creep.pos.y - 1, creep.pos.y + 1].find(safePosFinder)
            
            // 移动到不骑墙位置
            this.moveTo(new RoomPosition(x, y, creep.pos.roomName))
        }
    }

    /**
     * 判断当前是否在入口处（是否骑墙）
     */
    private onEnter(): boolean {
        return this.pos.x === 0 || this.pos.x === 49 || this.pos.y === 0 || this.pos.y === 49
    }

    /**
     * 检查旗帜是否存在
     * 不存在的话会在控制台给出提示
     * 
     * @param flagName 要检查的 flag 名称
     * @returns 有旗帜就返回旗帜, 否则返回 null
     */
    public getFlag(flagName: string): Flag | null {
        const flag = Game.flags[flagName]
        if (!flag) {
            this.log(`场上不存在名称为 [${flagName}] 的旗帜，请新建`)
            return null
        }
        else return flag
    }
}
