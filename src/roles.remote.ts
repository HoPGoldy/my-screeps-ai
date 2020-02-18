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
     * target: 占领指定房间
     * 
     * data:
     * @param targetRoomName 要占领的目标房间
     * @param ignoreRoom 要绕路的房间
     */ 
    claimer: (data: RemoteDeclarerData): ICreepConfig => ({
        // 该 creep 死了就不会再次孵化
        isNeed: () => false,
        // 向指定房间移动，这里移动是为了避免 target 阶段里 controller 所在的房间没有视野
        prepare: creep => {
            // 只要进入房间则准备结束
            if (creep.room.name !== data.targetRoomName) {
                creep.farMoveTo(new RoomPosition(25, 25, data.targetRoomName), data.ignoreRoom)
                return false
            }
            else return true
        },
        target: creep => {
            // 获取控制器
            const controller = creep.room.controller
            if (!controller) {
                creep.say('控制器呢？')
                return false
            }

            // 如果控制器不是自己或者被人预定的话就进行攻击
            if ((controller.owner && controller.owner.username !== creep.owner.username) || controller.reservation !== undefined) {
                if (creep.attackController(controller) == ERR_NOT_IN_RANGE) creep.moveTo(controller)
                return false
            }
            
            // 是中立控制器，进行占领
            const claimResult = creep.claimController(controller)
            if (claimResult === ERR_NOT_IN_RANGE) creep.goTo(controller.pos)
            else if (claimResult === OK) {
                console.log(`[${creep.name}] 新房间 ${data.targetRoomName} 占领成功！已向源房间 ${data.spawnRoom} 请求支援单位`)
                // 占领成功，发布支援组
                const spawnRoom = Game.rooms[data.spawnRoom]
                if (spawnRoom) spawnRoom.addRemoteHelper(data.targetRoomName, data.ignoreRoom)
                if (data.signText) creep.signController(controller, data.signText)
                creep.suicide()
            }
            else if (claimResult === ERR_INVALID_TARGET) { }
            else creep.say(`占领 ${claimResult}`)
        },
        bodys: [ MOVE, CLAIM ]
    }),

    /**
     * 预定者
     * 这个角色并不会想太多，出生了就去预定，一辈子走完了就不再出生，外矿采集单位采集的时候会检查预定剩余时间，如果不够了会自己发布该角色
     * 
     * 准备阶段：向指定房间控制器移动
     * 阶段A：预定控制器
     */
    reserver: (data: RemoteDeclarerData): ICreepConfig => ({
        // 该 creep 死了就不会再次孵化
        isNeed: () => false,
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
            if (creep.buildStructure() !== ERR_NOT_FOUND) { }
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
            const sourceFlag = Game.flags[data.sourceFlagName]
            if (!sourceFlag) {
                console.log(`找不到名称为 ${data.sourceFlagName} 的旗帜`)
                return false
            }

            /**
             * 如果有入侵者的话就不再孵化
             * @danger 注意这里并没有 disableTill 和当前进行对比，如果该值释放不及时可能会导致该角色无法正常持续孵化
             */
            if (room.memory.remote && room.memory.remote[sourceFlag.pos.roomName] && room.memory.remote[sourceFlag.pos.roomName].disableTill) return false

            return true
        },
        // 获取旗帜附近的 source
        prepare: creep => {
            if (!creep.memory.sourceId) {
                const sourceFlag = Game.flags[data.sourceFlagName]
                if (!sourceFlag) {
                    console.log(`[${creep.name}] 找不到名称为 ${data.sourceFlagName} 的旗帜`)
                    return false
                }

                // 旗帜所在房间没视野, 就进行移动
                if (!sourceFlag.room) creep.farMoveTo(sourceFlag.pos, data.ignoreRoom)
                else {
                    // 缓存外矿房间名
                    sourceFlag.memory.roomName = sourceFlag.room.name
                    const sources = sourceFlag.pos.lookFor(LOOK_SOURCES)
                    if (sources.length <= 0) {
                        console.log(`[${creep.name}] ${data.sourceFlagName} 附近没有找到 source`)
                        return false
                    }
                    // 找到 source 后就写入内存
                    creep.memory.sourceId = sources[0].id

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
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) <= 0) return true

            const sourceFlag = Game.flags[data.sourceFlagName]
            if (!sourceFlag) {
                console.log(`[${creep.name}] 找不到名称为 ${data.sourceFlagName} 的旗帜`)
                return false
            }

            // 掉血了就说明被攻击了，直接投降，告诉基地 1500 之后再孵化我
            if (creep.hits < creep.hitsMax) {
                const room = Game.rooms[data.spawnRoom]
                if (!room) {
                    console.log(`${creep.name} 在 source 阶段中找不到 ${room}`)
                    return false
                }
                // 如果还没有设置重生时间的话
                if (room.memory.remote[sourceFlag.pos.roomName] && !room.memory.remote[sourceFlag.pos.roomName].disableTill) {
                    // 将重生时间设置为 1500 tick 之后
                    room.memory.remote[sourceFlag.pos.roomName].disableTill = Game.time + 1500
                }
            }
            
            const source = Game.getObjectById<Source>(creep.memory.sourceId)
            const harvestResult = creep.harvest(source)
            if (harvestResult === OK) {
                // 如果发现 source 上限掉回 1500 了，就发布 reserver
                if (source.energyCapacity === SOURCE_ENERGY_NEUTRAL_CAPACITY) {
                    Game.rooms[data.spawnRoom].addRemoteReserver(creep.room.name)
                }
            }
            // 一旦被 core 占领就不再生成
            else if (harvestResult === ERR_NOT_OWNER && !(Game.time % 20)) {
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

                    // 如果还没有设置重生时间的话
                    if (room.memory.remote[sourceFlag.pos.roomName] && !room.memory.remote[sourceFlag.pos.roomName].disableTill) {
                        const collapseTimerEffect = core[0].effects.find(e => e.effect == EFFECT_COLLAPSE_TIMER)

                        if (collapseTimerEffect) {
                            /**
                             * 将重生时间设置为 core 消失之后
                             * 再加 5000 是因为 core 消失之后控制器还会有 5000 tick 的被预定时间 
                             */
                            room.memory.remote[sourceFlag.pos.roomName].disableTill = Game.time + collapseTimerEffect.ticksRemaining + 5000
                        }
                    }
                }
            }
            // 这里只要有异常就直接向外矿移动, 因为外矿有可能没视野, 下同
            else {
                creep.farMoveTo(sourceFlag.pos, data.ignoreRoom)
            }
        },
        target: creep => {
            // dontBuild 为 false 时表明还在建造阶段
            if (!creep.memory.dontBuild) {
                // 没有可建造的工地后就再也不建造
                const buildResult = creep.buildStructure()
                // 正在建造就禁止对穿
                if (buildResult === OK) {
                    if (!creep.memory.standed) {
                        creep.room.addRestrictedPos(creep.name, creep.pos)
                        creep.memory.standed = true
                    }
                }
                if (buildResult === ERR_NOT_FOUND)  creep.memory.dontBuild = true
                // 能量不足了就去 source 阶段，同时释放掉禁止通行点位
                else if (buildResult === ERR_NOT_ENOUGH_ENERGY) {
                    creep.room.removeRestrictedPos(creep.name)
                    delete creep.memory.standed
                    return true
                }
                
                return false
            }

            // 检查脚下的路有没有问题，有的话就进行维修
            const structures = creep.pos.lookFor(LOOK_STRUCTURES)
            if (structures.length > 0) {
                const road = structures[0]
                if (road.hits < road.hitsMax) creep.repair(road)
            }

            const target = Game.getObjectById<Structure>(data.targetId)
            if (!target) {
                console.log(`[${creep.name}] 找不到存放建筑 ${data.targetId}`)
                return false
            }
            
            // 再把剩余能量运回去
            const transferResult = creep.transfer(target, RESOURCE_ENERGY)
            // 报自己身上资源不足了就说明能量放完了
            if (transferResult === ERR_NOT_ENOUGH_RESOURCES) return true
            else if (transferResult === ERR_NOT_IN_RANGE) creep.farMoveTo(target.pos, data.ignoreRoom, 1)
            else if (transferResult === ERR_FULL) creep.say('满了啊')
            else if (transferResult !== OK) console.log(`[${creep.name}] target 阶段 transfer 出现异常，错误码 ${transferResult}`)

            return false
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