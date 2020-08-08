import { getOppositeDirection, assignPrototype } from 'utils'
import { repairSetting, minWallHits } from 'setting'
import roles from 'role'

// creep 原型拓展
export default class CreepExtension extends Creep {
    /**
     * creep 主要工作
     */
    public work(): void {
        // 检查 creep 内存中的角色是否存在
        if (!(this.memory.role in roles)) {
            this.log(`找不到对应的 creepConfig`, 'yellow')
            this.say('我凉了！')
            return
        }

        // 还没出生就啥都不干
        if (this.spawning) {
            if (this.ticksToLive === CREEP_LIFE_TIME) this._id = this.id // 解决 this creep not exist 问题
            return
        }

        // 快死时的处理
        if (this.ticksToLive <= 3) {
            // 如果还在工作，就释放掉自己的工作位置
            if (this.memory.standed) this.room.removeRestrictedPos(this.name)
        }

        // 获取对应配置项
        const creepConfig: ICreepConfig = roles[this.memory.role](this.memory.data)

        // 没准备的时候就执行准备阶段
        if (!this.memory.ready) {
            // 有准备阶段配置则执行
            if (creepConfig.prepare) this.memory.ready = creepConfig.prepare(this)
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
            if (creepConfig.target && creepConfig.target(this)) stateChange = true
        }
        else {
            if (creepConfig.source && creepConfig.source(this)) stateChange = true
        }

        // 状态变化了就释放工作位置
        if (stateChange) {
            this.memory.working = !this.memory.working
            if (this.memory.standed) {
                this.room.removeRestrictedPos(this.name)
                delete this.memory.standed
            }
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
        this.moveTo(enemy.pos)

        if (this.getActiveBodyparts(RANGED_ATTACK) > 0) this.rangedAttack(enemy)
        else this.attack(enemy)

        // 如果有可用 HEAL 身体并且掉血了则自我治疗
        if (this.getActiveBodyparts(HEAL) > 0 && this.hits < this.hitsMax) {
            this.heal(this)
        }
    }

    /**
     * 远程寻路
     * 
     * @param target 目标位置
     * @param range 搜索范围 默认为 1
     * @returns PathFinder.search 的返回值
     */
    public findPath(target: RoomPosition, range: number): string | null {
        if (!this.memory.farMove) this.memory.farMove = { }
        this.memory.farMove.index = 0

        // 先查询下缓存里有没有值
        const routeKey = `${this.room.serializePos(this.pos)} ${this.room.serializePos(target)}`
        let route = global.routeCache[routeKey]
        // 如果有值则直接返回
        if (route) {
            return route
        }
        
        const result = PathFinder.search(this.pos, { pos: target, range }, {
            plainCost: 2,
            swampCost: 10,
            maxOps: 4000,
            roomCallback: roomName => {
                // 强调了不许走就不走
                if (Memory.bypassRooms && Memory.bypassRooms.includes(roomName)) return false

                const room = Game.rooms[roomName]
                // 房间没有视野
                if (!room) return

                let costs = new PathFinder.CostMatrix

                room.find(FIND_STRUCTURES).forEach(struct => {
                    if (struct.structureType === STRUCTURE_ROAD) {
                        costs.set(struct.pos.x, struct.pos.y, 1)
                    }
                    // 不能穿过无法行走的建筑
                    else if (struct.structureType !== STRUCTURE_CONTAINER &&
                        (struct.structureType !== STRUCTURE_RAMPART || !struct.my) 
                    ) costs.set(struct.pos.x, struct.pos.y, 0xff)
                })

                // 避开房间中的禁止通行点
                const restrictedPos = room.getRestrictedPos()
                for (const creepName in restrictedPos) {
                    // 自己注册的禁止通行点位自己可以走
                    if (creepName === this.name) continue
                    const pos = room.unserializePos(restrictedPos[creepName])
                    costs.set(pos.x, pos.y, 0xff)
                }

                return costs
            }
        })

        // 寻路失败就通知玩家
        // if (result.incomplete) {
        //     const states = [
        //         `[${this.name} 未完成寻路] [游戏时间] ${Game.time} [所在房间] ${this.room.name}`,
        //         `[creep 内存]`,
        //         JSON.stringify(this.memory, null, 4),
        //         `[寻路结果]`,
        //         JSON.stringify(result)
        //     ]
        //     Game.notify(states.join('\n'))
        // }

        // 没找到就返回 null
        if (result.path.length <= 0) return null
        // 找到了就进行压缩
        route = this.serializeFarPath(result.path)
        // 保存到全局缓存
        if (!result.incomplete) global.routeCache[routeKey] = route
        
        return route
    }

    /**
     * 压缩 PathFinder 返回的路径数组
     * 
     * @param positions 房间位置对象数组，必须连续
     * @returns 压缩好的路径
     */
    public serializeFarPath(positions: RoomPosition[]): string {
        if (positions.length == 0) return ''
        // 确保路径的第一个位置是自己的当前位置
        if (!positions[0].isEqualTo(this.pos)) positions.splice(0, 0, this.pos)

        return positions.map((pos, index) => {
            // 最后一个位置就不用再移动
            if (index >= positions.length - 1) return null
            // 由于房间边缘地块会有重叠，所以这里筛除掉重叠的步骤
            if (pos.roomName != positions[index + 1].roomName) return null
            // 获取到下个位置的方向
            return pos.getDirectionTo(positions[index + 1])
        }).join('')
    }

    /**
     * 使用缓存进行移动
     * 该方法会对 creep.memory.farMove 产生影响
     * 
     * @returns ERR_NO_PATH 找不到缓存
     * @returns ERR_INVALID_TARGET 撞墙上了
     */
    public goByCache(): CreepMoveReturnCode | ERR_NO_PATH | ERR_NOT_IN_RANGE | ERR_INVALID_TARGET {
        if (!this.memory.farMove) return ERR_NO_PATH

        const index = this.memory.farMove.index
        // 移动索引超过数组上限代表到达目的地
        if (index >= this.memory.farMove.path.length) {
            delete this.memory.farMove.path
            return OK
        }

        // 获取方向，进行移动
        const direction = <DirectionConstant>Number(this.memory.farMove.path[index])
        const goResult = this.move(direction)
        
        // 移动成功，更新下次移动索引
        if (goResult == OK) this.memory.farMove.index ++
        
        return goResult
    }

    /**
     * 向指定方向移动
     * 
     * @param target 要移动到的方向
     * @returns ERR_INVALID_TARGET 发生撞停
     */
    public move(target: DirectionConstant | Creep): CreepMoveReturnCode | ERR_INVALID_TARGET | ERR_NOT_IN_RANGE {
        // const baseCost = Game.cpu.getUsed()
        // 进行移动，并分析其移动结果，OK 时才有可能发生撞停
        const moveResult = this._move(target) 

        if (moveResult != OK || target instanceof Creep) return moveResult
        
        const currentPos = `${this.pos.x}/${this.pos.y}`
        // 如果和之前位置重复了就分析撞上了啥
        if (this.memory.prePos && currentPos == this.memory.prePos) {
            // 尝试对穿，如果自己禁用了对穿的话则直接重新寻路
            const crossResult = this.memory.disableCross ? ERR_BUSY : this.mutualCross(target)

            // 没找到说明撞墙上了或者前面的 creep 拒绝对穿，重新寻路
            if (crossResult != OK) {
                delete this.memory._move
                return ERR_INVALID_TARGET
            }
        }

        // 没有之前的位置或者没重复就正常返回 OK 和更新之前位置
        this.memory.prePos = currentPos

        return OK
    }

    /**
     * 无视 Creep 的寻路
     * 
     * @param target 要移动到的位置
     */
    public goTo(target: RoomPosition): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND {
        // const baseCost = Game.cpu.getUsed()
        const moveResult = this.moveTo(target, {
            reusePath: 20,
            ignoreCreeps: true,
            costCallback: (roomName, costMatrix) => {
                if (roomName === this.room.name) {
                    // 避开房间中的禁止通行点
                    const restrictedPos = this.room.getRestrictedPos()
                    for (const creepName in restrictedPos) {
                        // 自己注册的禁止通行点位自己可以走
                        if (creepName === this.name) continue
                        
                        const pos = this.room.unserializePos(restrictedPos[creepName])
                        costMatrix.set(pos.x, pos.y, 0xff)
                    }
                }
                
                return costMatrix
            }
        })

        return moveResult
    }

    /**
     * 远程寻路
     * 包含对穿功能，会自动躲避 bypass 中配置的绕过房间
     * 
     * @param target 要移动到的位置对象
     * @param range 允许移动到目标周围的范围
     */
    public farMoveTo(target: RoomPosition, range: number = 0): CreepMoveReturnCode | ERR_NO_PATH | ERR_NOT_IN_RANGE | ERR_INVALID_TARGET {
        if (this.memory.farMove == undefined) this.memory.farMove = { }
        // 确认目标有没有变化, 变化了则重新规划路线
        const targetPosTag = this.room.serializePos(target)
        if (targetPosTag !== this.memory.farMove.targetPos) {
            this.memory.farMove.targetPos = targetPosTag
            this.memory.farMove.path = this.findPath(target, range)
        }
        // 确认缓存有没有被清除
        if (!this.memory.farMove.path) {
            this.memory.farMove.path = this.findPath(target, range)
        }

        // 还为空的话就是没找到路径
        if (!this.memory.farMove.path) {
            delete this.memory.farMove.path
            return OK
        }
        
        // 使用缓存进行移动
        const goResult = this.goByCache()

        // 如果发生撞停或者参数异常的话说明缓存可能存在问题，移除缓存
        if (goResult === ERR_INVALID_TARGET || goResult == ERR_INVALID_ARGS) {
            delete this.memory.farMove.path
        }
        // 其他异常直接报告
        else if (goResult != OK && goResult != ERR_TIRED) this.say(`远程寻路 ${goResult}`)

        return goResult
    }

    /**
     * 向指定方向发起对穿
     * 
     * @param direction 要进行对穿的方向
     * @returns OK 成功对穿
     * @returns ERR_BUSY 对方拒绝对穿
     * @returns ERR_NOT_FOUND 前方没有 creep
     */
    public mutualCross(direction: DirectionConstant): OK | ERR_BUSY | ERR_NOT_FOUND {
        // 获取前方位置上的 creep（fontCreep）
        const fontPos = this.pos.directionToPos(direction)
        if (!fontPos) return ERR_NOT_FOUND

        const fontCreep = fontPos.lookFor(LOOK_CREEPS)[0] || fontPos.lookFor(LOOK_POWER_CREEPS)[0]
        if (!fontCreep) return ERR_NOT_FOUND

        this.say(`👉`)
        // 如果前面的 creep 同意对穿了，自己就朝前移动
        if (fontCreep.requireCross(getOppositeDirection(direction))) this._move(direction)
        else return 

        return OK
    }

    /**
     * 请求对穿
     * 自己内存中 standed 为 true 时将拒绝对穿
     * 
     * @param direction 请求该 creep 进行对穿
     */
    public requireCross(direction: DirectionConstant): Boolean {
        // this 下没有 memory 说明 creep 已经凉了，直接移动即可
        if (!this.memory) return true

        // 拒绝对穿
        if (this.memory.standed) {
            this.say('👊')
            return false
        }

        // 同意对穿
        this.say('👌')
        this._move(direction)
        return true
    }

    /**
     * 填充本房间的 controller
     */
    public upgrade(): ScreepsReturnCode {
        const result = this.upgradeController(this.room.controller)

        // 如果刚开始站定工作，就把自己的位置设置为禁止通行点
        if (result === OK && !this.memory.standed) {
            this.memory.standed = true
            this.room.addRestrictedPos(this.name, this.pos)
        }
        else if (result == ERR_NOT_IN_RANGE) {
            this.goTo(this.room.controller.pos)
        }
        return result
    }

    /**
     * 建设房间内存在的建筑工地
     */
    public buildStructure(): CreepActionReturnCode | ERR_NOT_ENOUGH_RESOURCES | ERR_RCL_NOT_ENOUGH | ERR_NOT_FOUND {
        // 新建目标建筑工地
        let target: ConstructionSite = undefined
        // 检查是否有缓存
        if (this.room.memory.constructionSiteId) {
            target = Game.getObjectById(this.room.memory.constructionSiteId)
            // 如果缓存中的工地不存在则说明建筑完成
            if (!target) {
                // 获取曾经工地的位置
                const constructionSitePos = new RoomPosition(this.room.memory.constructionSitePos[0], this.room.memory.constructionSitePos[1], this.room.name)
                // 检查上面是否有已经造好的同类型建筑
                const structure = _.find(constructionSitePos.lookFor(LOOK_STRUCTURES), s => s.structureType === this.room.memory.constructionSiteType)
                if (structure) {
                    // 如果有的话就执行回调
                    if (structure.onBuildComplete) structure.onBuildComplete()

                    // 如果刚修好的是墙的话就记住该墙的 id，然后把血量刷高一点（相关逻辑见 builder.target()）
                    if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
                        this.memory.fillWallId = structure.id
                    }
                    // 如果修好的是 source container 的话，就执行注册
                    else if (structure instanceof StructureContainer && this.room.sources.find(s => structure.pos.isNearTo(s))) {
                        this.room.registerContainer(structure)
                    }
                }

                // 获取下个建筑目标
                target = this._updateConstructionSite()   
            }
        }
        // 没缓存就直接获取
        else target = this._updateConstructionSite()
        if (!target) return ERR_NOT_FOUND
        
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
     * 稳定新墙
     * 会把内存中 fillWallId 标注的墙声明值刷到定值以上
     */
    public steadyWall(): OK | ERR_NOT_FOUND {
        const wall = Game.getObjectById<StructureWall | StructureRampart>(this.memory.fillWallId)
        if (!wall) return ERR_NOT_FOUND

        if (wall.hits < minWallHits) {
            const result = this.repair(wall)
            if (result == ERR_NOT_IN_RANGE) this.goTo(wall.pos)
        }
        else delete this.memory.fillWallId

        return OK
    }

    /**
     * 获取下一个建筑工地
     * 有的话将其 id 写入自己 memory.constructionSiteId
     * 
     * @returns 下一个建筑工地，或者 null
     */
    private _updateConstructionSite(): ConstructionSite | undefined {
        const targets: ConstructionSite[] = this.room.find(FIND_MY_CONSTRUCTION_SITES)
        if (targets.length > 0) {
            let target: ConstructionSite
            // 优先建造 spawn，然后是 extension，想添加新的优先级就在下面的数组里追加即可
            for (const type of [ STRUCTURE_SPAWN, STRUCTURE_EXTENSION ]) {
                target = targets.find(cs => cs.structureType === type)
                if (target) break
            }
            // 优先建造的都完成了，按照距离建造
            if (!target) target = this.pos.findClosestByRange(targets)

            // 缓存工地信息，用于统一建造并在之后验证是否完成建造
            this.room.memory.constructionSiteId = target.id
            this.room.memory.constructionSiteType = target.structureType
            this.room.memory.constructionSitePos = [ target.pos.x, target.pos.y ]
            return target
        }
        else {
            delete this.room.memory.constructionSiteId
            delete this.room.memory.constructionSiteType
            delete this.room.memory.constructionSitePos
            return undefined
        }
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
        if (result === OK) {
            if (!this.memory.standed) {
                this.memory.standed = true
                this.room.addRestrictedPos(this.name, this.pos)
            }
            
            // 离墙三格远可能正好把路堵上，所以要走进一点
            if (!targetWall.pos.inRangeTo(this.pos, 2)) this.goTo(targetWall.pos)
        }
        else if (result == ERR_NOT_IN_RANGE) {
            this.goTo(targetWall.pos)
        }
        return true
    }

    /**
     * 从目标结构获取能量
     * 
     * @param target 提供能量的结构
     * @returns 执行 harvest 或 withdraw 后的返回值
     */
    public getEngryFrom(target: StructureWithStore | Source): ScreepsReturnCode {
        let result: ScreepsReturnCode
        // 是建筑就用 withdraw
        if (target instanceof Structure) {
            // 如果建筑里没能量了就不去了，防止出现粘性
            if (target.store[RESOURCE_ENERGY] <= 0) return ERR_NOT_ENOUGH_ENERGY
            result = this.withdraw(target as Structure, RESOURCE_ENERGY)
        }
        // 不是的话就用 harvest
        else {
            result = this.harvest(target as Source)

            // harvest 需要长时间占用该位置，所以需要禁止对穿
            // withdraw 则不需要
            if (result === OK) {
                // 开始采集能量了就拒绝对穿
                if (!this.memory.standed) {
                    this.room.addRestrictedPos(this.name, this.pos)
                    this.memory.standed = true
                }
            }
        }

        if (result === ERR_NOT_IN_RANGE) this.goTo(target.pos)

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
        this.goTo(target.pos)
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
            this.farMoveTo(attackFlag.pos)
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
            if (!this.canMoveWith(healer)) return true
            this.farMoveTo(attackFlag.pos)
            return true
        }

        // 如果到旗帜所在房间了
        const structures = attackFlag.pos.lookFor(LOOK_STRUCTURES)
        if (structures.length == 0) this.say('干谁?')

        if (this.canMoveWith(healer)) this.moveTo(attackFlag)
        this.dismantle(structures[0])
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
        if (this.pos.x === 0 || this.pos.x === 49 || this.pos.y === 0 || this.pos.y === 49) {
            const safePosFinder = i => i !== 0 && i !== 49
            // 遍历找到目标 creep 身边的不骑墙位置
            const x = [creep.pos.x - 1, creep.pos.x + 1].find(safePosFinder)
            const y = [creep.pos.y - 1, creep.pos.y + 1].find(safePosFinder)
            
            // 移动到不骑墙位置
            this.moveTo(new RoomPosition(x, y, creep.pos.roomName))
        }
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
