import { DEFAULT_FLAG_NAME, PB_HARVESTE_STATE, DEPOSIT_MAX_COOLDOWN } from './setting'
import { calcBodyPart } from './utils'

/**
 * 多房间角色组
 * 本角色组包括了多房间拓展所需要的角色
 */
const roles: {
    [role in RemoteRoleConstant]: (data: CreepData) => ICreepConfig
} = {
    /**
     * 占领者
     * source: 无
     * target: 占领指定房间
     */ 
    claimer: (data: RemoteDeclarerData): ICreepConfig => ({
        target: creep => {
            const claimFlag = creep.getFlag(DEFAULT_FLAG_NAME.CLAIM)
            if (!claimFlag) return false

            // 如果 creep 不在房间里 则一直向旗帜移动
            if (!claimFlag.room || (claimFlag.room && creep.room.name !== claimFlag.room.name)) {
                creep.farMoveTo(claimFlag.pos, data.ignoreRoom)
            }

            // 已经抵达了该房间
            const room = claimFlag.room
            // 如果房间已经被占领或者被预定了则攻击控制器
            if (room && (room.controller.owner !== undefined || room.controller.reservation !== undefined)) {
                // 确保房间所有者不是自己
                if (room.controller.owner.username != creep.owner.username) {
                    if (creep.attackController(room.controller) == ERR_NOT_IN_RANGE) creep.moveTo(room.controller)
                    return false
                }
            }
            // 如果房间无主则占领
            if (room && creep.claimController(room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(room.controller)
            }
        },
        bodys: [ MOVE, CLAIM ]
    }),

    /**
     * 预定者
     * 准备阶段：向指定房间控制器移动
     * 阶段A：预定控制器
     */
    reserver: (data: RemoteDeclarerData): ICreepConfig => ({
        isNeed: (room) => {
            if (!room.memory.remote) room.memory.remote = {}
            // 存在该字段说明外矿有入侵者
            if (room.memory.remote[data.targetRoomName]) {
                // 有该字段并且当前时间没有到其标注的时间
                // 说明外矿还有活着的入侵者
                if (Game.time < room.memory.remote[data.targetRoomName]) return false
                // 否则就说明入侵者已经死了
                delete room.memory.remote[data.targetRoomName]
            }

            // 如果房间没有视野则默认进行孵化
            if (!Game.rooms[data.targetRoomName]) {
                // console.log('[reserver] 房间没有视野 默认孵化')
                return true
            }
            
            const controller: StructureController = Game.rooms[data.targetRoomName].controller
            
            // 房间没有预定也孵化
            if (!controller.reservation) {
                // console.log('[reserver] 房间没有预定 默认孵化')
                return true
            }
            // 房间还剩 2500 ticks 预定就到期了则进行孵化
            if (controller.reservation.ticksToEnd <= 2500) return true
            // console.log(`[reserver] 房间的预定时长为 ${controller.reservation.ticksToEnd} 不予孵化`)
            // 不然不孵化
            return false
        },
        // 向指定房间移动，这里移动是为了避免 target 阶段里 controller 所在的房间没有视野
        prepare: creep => {
            // 只要进入房间则准备结束
            if (creep.room.name !== data.targetRoomName) {
                creep.farMoveTo(new RoomPosition(25, 25, data.targetRoomName), data.ignoreRoom)
                return false
            }
            else return true
        },
        // 一直进行预定
        target: creep => {
            // 如果房间的预订者不是自己, 就攻击控制器
            if (creep.room.controller.reservation && creep.room.controller.reservation.username !== creep.owner.username) {
                if (creep.attackController(creep.room.controller) == ERR_NOT_IN_RANGE) creep.farMoveTo(Game.rooms[data.targetRoomName].controller.pos, data.ignoreRoom, 1)
            }
            // 房间没有预定满, 就继续预定
            if (!creep.room.controller.reservation || creep.room.controller.reservation.ticksToEnd < CONTROLLER_RESERVE_MAX) {
                if (creep.reserveController(creep.room.controller) == ERR_NOT_IN_RANGE) creep.farMoveTo(Game.rooms[data.targetRoomName].controller.pos, data.ignoreRoom, 1)
            }
            return false
        },
        bodys: 'reserver'
    }),

    /**
     * 签名者
     * 会先抵达指定房间, 然后执行签名
     * 
     * @param spawnRoom 出生房间名称
     * @param targetRoomName 要签名的目标房间名
     * @param signText 要签名的内容
     * @param ignoreRoom 不让过的房间名数组
     */
    signer: (data: RemoteDeclarerData): ICreepConfig => ({
        target: creep => {
            if (creep.room.name === data.targetRoomName) {
                if (creep.signController(creep.room.controller, data.signText) === ERR_NOT_IN_RANGE) {
                    creep.goTo(creep.room.controller.pos)
                }
            }
            else creep.farMoveTo(new RoomPosition(25, 25, data.targetRoomName), data.ignoreRoom)

            return false
        },
        bodys: [ MOVE ]
    }),

    /**
     * 支援者
     * 拓展型建造者, 会先抵达指定房间, 然后执行建造者逻辑
     * 如果都造好的话就升级控制器
     */
    remoteBuilder: (data: RemoteHelperData): ICreepConfig => ({
        // 向指定房间移动
        prepare: creep => {
            // 只要进入房间则准备结束
            if (creep.room.name !== data.targetRoomName) {
                creep.farMoveTo(new RoomPosition(25, 25, data.targetRoomName), data.ignoreRoom)
                return false
            }
            else {
                delete creep.memory.farMove
                return true
            }
        },
        // 下面是正常的建造者逻辑
        source: creep => {
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return true
            creep.getEngryFrom(Game.getObjectById(data.sourceId))
        },
        target: creep => {
            if (creep.buildStructure()) { }
            else if (creep.upgrade()) { }

            if (creep.store.getUsedCapacity() === 0) return true
        },
        bodys: 'worker'
    }),

    /**
     * 支援 - 采矿者
     * 拓展型建造者, 会先抵达指定房间, 然后执行建造者逻辑
     */
    remoteUpgrader: (data: RemoteHelperData): ICreepConfig => ({
        // 向指定房间移动
        prepare: creep => {
            // 只要进入房间则准备结束
            if (creep.room.name !== data.targetRoomName) {
                creep.farMoveTo(new RoomPosition(25, 25, data.targetRoomName), data.ignoreRoom)
                return false
            }
            else {
                delete creep.memory.farMove
                return true
            }
        },
        // 下面是正常的升级者逻辑
        source: creep => {
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return true
            creep.getEngryFrom(Game.getObjectById(data.sourceId))
        },
        target: creep => {
            creep.upgrade()
            if (creep.store.getUsedCapacity() === 0) return true
        },
        bodys: 'upgrader'
    }),

    /**
     * 外矿采集者
     * 从指定矿中挖矿 > 将矿转移到建筑中
     */
    remoteHarvester: (data: RemoteHarvesterData): ICreepConfig => ({
        // 如果外矿目前有入侵者就不生成
        isNeed: room => {
            // 旗帜效验, 没有旗帜则不生成
            if (!Game.flags[data.sourceFlagName]) {
                console.log(`找不到名称为 ${data.sourceFlagName} 的旗帜`)
                return false
            }
            // 从旗帜内存中获取房间名
            // 内存中没有房间名就说明外矿刚刚建立，默认进行生成
            const remoteRoomName = Game.flags[data.sourceFlagName].memory.roomName
            if (!remoteRoomName) return true

            if (!room.memory.remote) room.memory.remote = {}
            // 不存在该字段说明外矿状态良好
            if (!room.memory.remote[remoteRoomName]) return true
            // 有该字段并且当前时间没有到其标注的时间
            // 说明外矿还有活着的入侵者
            if (Game.time < room.memory.remote[remoteRoomName]) return false
            // 否则就说明入侵者已经死了
            delete room.memory.remote[remoteRoomName]
            return true
        },
        // 获取旗帜附近的 source
        prepare: creep => {
            if (!creep.memory.sourceId) {
                const sourceFlag = Game.flags[data.sourceFlagName]
                // 旗帜所在房间没视野, 就进行移动
                if (!sourceFlag.room) creep.farMoveTo(sourceFlag.pos, data.ignoreRoom)
                else {
                    // 缓存外矿房间名
                    sourceFlag.memory.roomName = sourceFlag.room.name
                    const source = sourceFlag.pos.findClosestByRange(FIND_SOURCES)
                    if (!source) {
                        console.log(`${data.sourceFlagName} 附近没有找到 source`)
                        return false
                    }
                    // 找到 source 后就写入内存
                    creep.memory.sourceId = source.id

                    // 再检查下有没有工地, 没有则以后再也不检查
                    const constructionSites = sourceFlag.room.find(FIND_CONSTRUCTION_SITES)
                    if (constructionSites.length <= 0)
                    creep.memory.dontBuild = true
                }
                return false
            }
            else return true
        },
        // 向旗帜出发
        source: creep => {
            const sourceFlag = Game.flags[data.sourceFlagName]

            // 检查房间内有没有敌人，10 tick 检查一次
            if (!(Game.time % 10) && sourceFlag.room) {
                if (!sourceFlag.room._hasEnemy) {
                    sourceFlag.room._hasEnemy = sourceFlag.room.find(FIND_HOSTILE_CREEPS).length > 0
                }
                // 有的话向基地报告
                if (sourceFlag.room._hasEnemy) {
                    const room = Game.rooms[data.spawnRoom]
                    if (!room) {
                        console.log(`${creep.name} 在 source 阶段中找不到 ${room}`)
                        return false
                    }
                    if (!room.memory.remote) room.memory.remote = {}
                    // 如果还没有设置重生时间的话
                    if (!room.memory.remote[sourceFlag.room.name]) {
                        // 将重生时间设置为 1500 tick 之后
                        room.memory.remote[sourceFlag.room.name] = Game.time + 1500
                    }
                }
            }
            
            const harvestResult = creep.harvest(Game.getObjectById(creep.memory.sourceId))
            // 一旦被 core 占领就不再生成
            if (harvestResult == ERR_NOT_OWNER && !(Game.time % 20)) {
                const core = creep.room.find(FIND_STRUCTURES, {
                    filter: s => s.structureType == STRUCTURE_INVADER_CORE
                })

                // 发现入侵者 core
                if (core.length > 0) {
                    const room = Game.rooms[data.spawnRoom]
                    if (!room) {
                        console.log(`${creep.name} 在 source 阶段中找不到 ${room}`)
                        return false
                    }
                    if (!room.memory.remote) room.memory.remote = {}
                    // 如果还没有设置重生时间的话
                    if (!room.memory.remote[sourceFlag.room.name]) {
                        const collapseTimerEffect = core[0].effects.find(e => e.effect == EFFECT_COLLAPSE_TIMER)

                        if (collapseTimerEffect) {
                            /**
                             * 将重生时间设置为 core 消失之后
                             * 
                             * @danger core 消失之后还有 4000 tick 无法采集
                             * 但是由于 remoteHarvester 和 reserver 生成用的是同一个计时器
                             * 所以在 core 消失之后依旧会直接生成 remoteHarvester 在 source 前傻站至多 4000 tick
                             */
                            room.memory.remote[sourceFlag.room.name] = Game.time + collapseTimerEffect.ticksRemaining
                        }
                    }
                }
            }
            // 这里的移动判断条件是 !== OK, 因为外矿有可能没视野, 下同
            else if (harvestResult !== OK) {
                creep.farMoveTo(sourceFlag.pos, data.ignoreRoom)
            }
        },
        target: creep => {
            // dontBuild 为 false 时表明还在建造阶段
            if (!creep.memory.dontBuild) {
                // 没有可建造的工地后就再也不建造
                if (!creep.buildStructure()) {
                    creep.memory.dontBuild = true
                    delete creep.memory.constructionSiteId
                }
                return false
            }

            // 检查脚下的路有没有问题，有的话就进行维修
            const structures = creep.pos.lookFor(LOOK_STRUCTURES)
            if (structures.length > 0) {
                const road = structures[0]
                if (road.hits < road.hitsMax) creep.repair(road)
            }

            const room = Game.rooms[data.spawnRoom]
            if (!room || !room.terminal) {
                console.log(`[${creep.name}] 找不到存放建筑`)
                return false
            }
            
            // 再把剩余能量运回去
            if (creep.transfer(room.storage, RESOURCE_ENERGY)) return true
            else creep.farMoveTo(room.storage.pos, data.ignoreRoom, 1)
        },
        bodys: 'remoteHarvester'
    }),

    /**
     * deposit 采集者
     * 从指定矿中挖 deposit > 将挖出来的资源转移到建筑中
     */
    depositHarvester: (data: RemoteHarvesterData): ICreepConfig => ({
        isNeed: room => {
            // 旗帜效验, 没有旗帜则不生成
            const targetFlag = Game.flags[data.sourceFlagName]
            if (!targetFlag) return false

            // 冷却时长过长则放弃该 deposit
            if (targetFlag.memory.depositCooldown >= DEPOSIT_MAX_COOLDOWN) {
                Memory.flags[targetFlag.name] = {}
                targetFlag.remove()
                return false
            }
            return true
        },
        source: creep => {
            // 旗帜效验, 没有旗帜则原地待命
            const targetFlag = Game.flags[data.sourceFlagName]
            if (!targetFlag) {
                console.log(`[${creep.name}] 找不到名称为 ${data.sourceFlagName} 的旗帜`)
                creep.say('旗呢？')
                return false
            }

            // 如果采集满了 / 冷却时间太长 / 自己快死了，就往家跑
            if (
                (creep.store.getFreeCapacity(creep.memory.depositType) <= 0) ||
                (targetFlag.memory.depositCooldown >= 100 && !creep.memory.working) ||
                (creep.ticksToLive <= (targetFlag.memory.travelTime * 2) + 20)
            ) return true

            // 还没到就继续走
            if (!targetFlag.pos.isNearTo(creep.pos)) {
                // 边走边记录抵达时间
                if (targetFlag.memory.travelTime == undefined) targetFlag.memory.travelTime = 0 // 初始化
                // 旅途时间还没有计算完成
                else if (!targetFlag.memory.travelComplete) targetFlag.memory.travelTime ++ // 增量

                creep.farMoveTo(targetFlag.pos, [], 1)

                return false
            }
            // 完成旅途时间计算
            else targetFlag.memory.travelComplete = true

            // 获取目标
            let target: Deposit
            if (targetFlag.memory.sourceId) target = Game.getObjectById(targetFlag.memory.sourceId)
            else {
                target = targetFlag.pos.lookFor(LOOK_DEPOSITS)[0]
                
                // 找到了就赋值并缓存
                if (target) targetFlag.memory.sourceId = target.id
                // 找不到就失去了存在的意义
                else {
                    Memory.flags[targetFlag.name] = {}
                    targetFlag.remove()
                    creep.suicide()
                    return
                }
            }

            if (target.cooldown) return false

            const harvestResult = creep.harvest(target)
            // 采集成功更新冷却时间及资源类型
            if (harvestResult == OK) {
                targetFlag.memory.depositCooldown = target.lastCooldown
                if (!creep.memory.depositType) creep.memory.depositType = target.depositType
            }
            // 采集失败就提示
            else creep.say(`采集 ${harvestResult}`)
        },
        target: creep => {
            const room = Game.rooms[data.spawnRoom]
            if (!room || !room.terminal) {
                console.log(`[${creep.name}] 找不到存放建筑`)
                return false
            }
            
            // 转移并检测返回值
            const transferResult = creep.transfer(room.terminal, creep.memory.depositType)
            if (transferResult === OK) {
                // 获取旗帜，旗帜没了就自杀
                const targetFlag = Game.flags[data.sourceFlagName]
                if (!targetFlag) {
                    creep.suicide()
                    return false
                }

                // 如果来不及再跑一趟的话就自杀
                // 这里的跑一趟包含来回，所以时间会更长
                if (creep.ticksToLive <= (targetFlag.memory.travelTime * 3) + 20) {
                    creep.suicide()
                    return false
                }

                // 时间充足就回去继续采集
                return true
            }
            if (transferResult === ERR_NOT_IN_RANGE) creep.farMoveTo(room.terminal.pos, [], 1)
            else creep.say(`转移 ${transferResult}`)
        },
        bodys: 'remoteHarvester'
    }),

    /**
     * PowerBank 攻击单位
     * 移动并攻击 powerBank, 请在 8 级时生成
     * @see doc "../doc/PB 采集小组设计案"
     */
    pbAttacker: (data: RemoteHarvesterData): ICreepConfig => ({
        isNeed: room => {
            // 旗帜校验
            const targetFlag = Game.flags[data.sourceFlagName]
            if (!targetFlag) return false

            // 如果旗帜的状态符合的话，就进行生成
            if (
                targetFlag.memory.state == undefined ||
                targetFlag.memory.state == PB_HARVESTE_STATE.ATTACK ||
                targetFlag.memory.state == PB_HARVESTE_STATE.PREPARE
            ) return true
            
            // 默认不生成
            return false
        },
        prepare: creep => {
            const targetFlag = Game.flags[data.sourceFlagName]
            if (!targetFlag) {
                creep.say('旗呢？')
                return false
            }

            // 朝目标移动
            creep.farMoveTo(targetFlag.pos, [], 1)

            // 进入房间后搜索 pb 并缓存
            if (!targetFlag.memory.sourceId && creep.room.name === targetFlag.pos.roomName) {
                const powerbank = _.find(targetFlag.pos.lookFor(LOOK_STRUCTURES), s => s.structureType === STRUCTURE_POWER_BANK) as StructurePowerBank
                // 并写入缓存
                if (powerbank) targetFlag.memory.sourceId = powerbank.id
                else {
                    // 没找到说明已经没了
                    Memory.flags[targetFlag.name] = {}
                    targetFlag.remove()
                    creep.suicide()
                    return false
                }
            }

            // 如果到了就算准备完成
            if (creep.pos.isNearTo(targetFlag.pos)) {
                creep.room.addRestrictedPos(creep.name, creep.pos)
                // 检查下是否还没统计移动所需时间
                if (!targetFlag.memory.travelTime) targetFlag.memory.travelTime = CREEP_LIFE_TIME - creep.ticksToLive
                return true
            }

            return false
        },
        target: creep => {
            const targetFlag = Game.flags[data.sourceFlagName]
            if (!targetFlag) {
                console.log(`[${creep.name}] 未找到旗帜，待命中`)
                return false
            }
            if (creep.ticksToLive <= 1) creep.room.removeRestrictedPos(creep.name)

            // 获取 pb
            let powerbank: StructurePowerBank = undefined
            if (targetFlag.memory.sourceId) powerbank = Game.getObjectById(targetFlag.memory.sourceId)
            else {
                // 没有缓存就进行查找
                powerbank = _.find(targetFlag.pos.lookFor(LOOK_STRUCTURES), s => s.structureType === STRUCTURE_POWER_BANK) as StructurePowerBank
                // 并写入缓存
                if (powerbank) targetFlag.memory.sourceId = powerbank.id
            }

            // 找不到 pb 了，进入下个阶段
            if (!powerbank) {
                targetFlag.memory.state = PB_HARVESTE_STATE.TRANSFE
                creep.suicide()
                creep.room.removeRestrictedPos(creep.name)
                return false
            }

            const attackResult = creep.attack(powerbank)

            // 如果血量低于标准了，则通知运输单位进行提前生成
            if (attackResult === OK) {
                /**
                 * @danger 注意下面这行后面的 *2，代表有两组 attack 再同时拆 bp
                 * 如果只配置了一组的话，那么 prepare 阶段的时间就会提前
                 */
                if ((targetFlag.memory.state != PB_HARVESTE_STATE.PREPARE) && (powerbank.hits <= (targetFlag.memory.travelTime + 150) * 600 * 2)) {
                    targetFlag.memory.state = PB_HARVESTE_STATE.PREPARE
                    console.log('准备阶段！')
                }
            }
            else if (attackResult === ERR_NOT_IN_RANGE) creep.moveTo(powerbank)
        },
        bodys: calcBodyPart({ [ATTACK]: 20, [MOVE]: 20 })
    }),

    /**
     * PowerBank 治疗单位
     * 移动并治疗 pbAttacker, 请在 8 级时生成
     * @see doc "../doc/PB 采集小组设计案"
     */
    pbHealer: (data: HealUnitData): ICreepConfig => ({
        isNeed: () => {
            const targetCreep = Game.creeps[data.creepName]

            // 攻击 creep 存在时才会生成
            if (targetCreep) return true

            // 默认不生成
            return false
        },
        target: creep => {
            const targetCreep = Game.creeps[data.creepName]
            // 对象没了就殉情
            if (!targetCreep) {
                creep.suicide()
                return false
            }

            // 移动到身边了就治疗
            if (creep.pos.isNearTo(targetCreep)) creep.heal(targetCreep)
            else creep.farMoveTo(targetCreep.pos)
        },
        bodys: calcBodyPart({ [HEAL]: 25, [MOVE]: 25 })
    }),

    /**
     * PowerBank 运输单位
     * 搬运 PowerBank Ruin 中的 power, 请在 8 级时生成
     * @see doc "../doc/PB 采集小组设计案"
     * 
     * @param spawnRoom 出生房间名称
     * @param sourceFlagName 旗帜的名称 (插在 PowerBank 上)
     * @param targetId 要搬运到的建筑 id（默认为 terminal）
     */
    pbTransfer: (data: RemoteHarvesterData): ICreepConfig => ({
        isNeed: room => {
            // 旗帜校验
            const targetFlag = Game.flags[data.sourceFlagName]
            if (!targetFlag) return false

            // 如果旗帜的状态符合的话，就进行生成
            if (
                targetFlag.memory.state == PB_HARVESTE_STATE.PREPARE ||
                targetFlag.memory.state == PB_HARVESTE_STATE.TRANSFE
            ) return true
            
            // 默认不生成
            return false
        },
        // 移动到目标三格之内就算准备完成
        prepare: creep => {
            const targetFlag = Game.flags[data.sourceFlagName]
            if (!targetFlag) {
                // console.log(`[${creep.name}] 未找到旗帜，待命中`)
                // creep.say('搬啥？')
                creep.suicide()
                return false
            }

            creep.farMoveTo(targetFlag.pos)

            return creep.pos.inRangeTo(targetFlag.pos, 3)
        },
        source: creep => {
            const targetFlag = Game.flags[data.sourceFlagName]
            if (!targetFlag) {
                // console.log(`[${creep.name}] 未找到旗帜，待命中`)
                // creep.say('搬啥？')
                creep.suicide()
                return false
            }
            // 没到搬运的时候就先待命
            if (targetFlag.memory.state !== PB_HARVESTE_STATE.TRANSFE) return false
            // 到行动阶段了就过去
            creep.goTo(targetFlag.pos)

            // 到房间里再进行下一步操作
            if (creep.room.name !== targetFlag.pos.roomName) return false

            // 获取 powerBank 的废墟
            const powerbankRuin: Ruin = targetFlag.pos.lookFor(LOOK_RUINS)[0]

            // 如果 pb 废墟还存在
            if (powerbankRuin) {
                if (creep.withdraw(powerbankRuin, RESOURCE_POWER) === OK) return true
            }
            // 如果废墟没了就从地上捡
            else {
                const power = targetFlag.pos.lookFor(LOOK_RESOURCES)[0]
                if (power) {
                    if (creep.pickup(power) === OK) return true
                }
                else {
                    // 地上的 power 也没了就正式采集结束了
                    Memory.flags[targetFlag.name] = {}
                    targetFlag.remove()
                    creep.suicide()
                }
            }
        },
        target: creep => {
            // 获取资源运输目标房间并兜底
            const room = Game.rooms[data.spawnRoom]
            if (!room || !room.terminal) {
                console.log(`[${creep.name}] 找不到存放建筑`)
                return false
            }
            
            // 存放资源
            const transferResult = creep.transfer(room.terminal, RESOURCE_POWER)
            if (transferResult === OK) {
                const targetFlag = Game.flags[data.sourceFlagName]
                // 旗帜不存在或者自己已经来不及再搬一趟了，就自杀
                if (
                    !targetFlag ||
                    creep.ticksToLive < (targetFlag.memory.travelTime * 2) + 10    
                ) {
                    creep.suicide()
                    return false
                }
                return true
            }
            else if (transferResult === ERR_NOT_IN_RANGE) creep.farMoveTo(room.terminal.pos)
        },
        bodys: calcBodyPart({ [CARRY]: 25, [MOVE]: 25 })
    }),

     /**
     * 移动测试单位
     * 一直朝着旗帜移动
     * 
     * @param spawnRoom 出生房间名称
     * @param flagName 目标旗帜名称
     */
    moveTester: (data: RemoteHarvesterData): ICreepConfig => ({
        target: creep => {
            const targetFlag = Game.flags[data.sourceFlagName]
            if (!targetFlag) {
                console.log(`[${creep.name}] 找不到 ${data.sourceFlagName} 旗帜`)
                creep.say('旗呢？')
                return false
            }
            let cost1 = Game.cpu.getUsed()
            creep.farMoveTo(targetFlag.pos, [])
            console.log('移动消耗', Game.cpu.getUsed() - cost1)

            return false
        },
        bodys: [ MOVE ]
    }),
}

export default roles