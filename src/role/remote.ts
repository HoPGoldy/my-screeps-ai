import { PB_HARVESTE_STATE, DEPOSIT_MAX_COOLDOWN } from 'setting'
import { calcBodyPart, getName } from 'utils'

/**
 * 多房间角色组
 * 本角色组包括了多房间拓展所需要的角色
 */
const roles: {
    [role in RemoteRoleConstant]: (data: CreepData) => ICreepConfig
} = {
    /**
     * 掠夺者
     * 暂不支持从 ruin 中获取资源
     * 从指定房间的目标建筑（由旗帜指定）中搬运物品到指定建筑
     * 在目标建筑搬空后将会移除旗帜并自杀
     * 
     * data:
     * @param flagName 目标建筑上的旗帜名称
     * @param targetStructureId 要搬运到的建筑 id
     */
    reiver: (data: ReiverData): ICreepConfig => ({
        // 要搬运资源的目标旗帜消失了就不再生成
        isNeed: () => data.flagName in Game.flags, 
        // 如果已经统计了移动
        prepare: creep => {
            const flag = Game.flags[data.flagName]
            if (!flag) {
                creep.log(`未找到名为 ${data.flagName} 的旗帜，请在目标建筑上新建`)
                return false
            }

            // 如果路程已经统计完了就不再统计
            if (flag.memory.travelComplete && flag.memory.sourceId) return true
            // 进入房间了
            else if (flag.room) {
                if (!flag.memory.sourceId) {
                    // 搜索包含存储的目标建筑并存储
                    let targetStructure: StructureWithStore | Ruin = flag.pos.lookFor(LOOK_STRUCTURES).find(s => 'store' in s) as StructureWithStore
                    
                    if (!targetStructure) {
                        // 查找废墟，如果有包含 store 的废墟就设为目标
                        const ruins = flag.pos.lookFor(LOOK_RUINS)
                        for (const ruin of ruins) {
                            if ('store' in ruin && ruin.store.getUsedCapacity() > 0) {
                                targetStructure = ruin
                                break
                            }
                        }
                    }

                    if (targetStructure) {
                        flag.memory.sourceId = targetStructure.id
                    }
                    else creep.say('没找到建筑啊')
                }

                // 如果移动到附近了就准备完成
                if (creep.pos.isNearTo(flag)) {
                    flag.memory.travelComplete = true
                }
            }

            // 移动并统计移动时长
            creep.farMoveTo(flag.pos)
            flag.memory.travelTime = flag.memory.travelTime === undefined ? 0 : flag.memory.travelTime + 1
            return false
        },
        source: creep => {
            const flag = Game.flags[data.flagName]
            if (!flag) {
                creep.suicide()
                return false
            }

            if (flag.room) {
                const targetStructure = Game.getObjectById<StructureWithStore | Ruin>(flag.memory.sourceId)
                // 如果对应的房间里没有找到目标建筑就自杀并移除旗帜
                if (!targetStructure) {
                    delete Memory.flags[data.flagName]
                    flag.remove()
                    creep.suicide()
                    return false
                }

                // 遍历目标建筑存储并找到可以拿取的资源
                for (const res in targetStructure.store) {
                    if (targetStructure.store[res] > 0) {
                        // 如果有指定要搬运的资源，就看 res 是否是指定的资源之一，是则搬运，不是则检查下一个
                        if (Memory.reiveList && Memory.reiveList.length > 0) {
                            if (!Memory.reiveList.includes(res as ResourceConstant)) continue
                        }

                        const withdrawResult = creep.withdraw(targetStructure, res as ResourceConstant)

                        // 如果拿满了就执行 target
                        if (withdrawResult === ERR_FULL) return true
                        // 还没到就继续走
                        else if (withdrawResult === ERR_NOT_IN_RANGE) {
                            creep.farMoveTo(targetStructure.pos)
                        }
                        
                        // 等到下个 tick 重新遍历来继续搬
                        return false
                    }
                }

                // 上面的遍历完了就说明搬空了，移除旗帜并执行 target
                delete Memory.flags[data.flagName]
                flag.remove()
                return true
            }
            // 没有到指定房间就移动
            else creep.farMoveTo(flag.pos)
            return false
        },
        target: creep => {
            const targetStructure = Game.getObjectById<StructureWithStore>(data.targetId)
            if (!targetStructure) {
                creep.log(`找不到要存放资源的建筑 ${data.targetId}`, 'yellow')
                creep.say('搬到哪？')
                return false
            }

            if (creep.room.name === targetStructure.room.name) {
                // 遍历目标建筑存储并找到可以拿取的资源
                for (const res in creep.store) {
                    if (creep.store[res] > 0) {
                        const result = creep.transfer(targetStructure, res as ResourceConstant)

                        // 还没到就继续走
                        if (result === ERR_NOT_IN_RANGE) creep.farMoveTo(targetStructure.pos)
                        return false
                    }
                }

                // 上面的遍历完了就说明放完了，检查生命值，如果还够搬一趟的就过去，否则自杀
                const flag = Game.flags[data.flagName] 
                if (!flag) {
                    creep.suicide()
                    return false
                }
                
                // 乘以 3 是去一趟，回来的时候走的慢需要两倍的时间再加上沼泽可能更慢，40 是冗余
                if (creep.ticksToLive >= flag.memory.travelTime * 3 + 40) return true
                else {
                    creep.suicide()
                    return false
                }
            }
            else creep.farMoveTo(targetStructure.pos)
        },
        bodys: 'manager'
    }),

    /**
     * 占领者
     * target: 占领指定房间
     * 
     * data:
     * @param targetRoomName 要占领的目标房间
     */ 
    claimer: (data: RemoteDeclarerData): ICreepConfig => ({
        // 该 creep 死了不会再次孵化
        isNeed: () => false,
        // 向指定房间移动，这里移动是为了避免 target 阶段里 controller 所在的房间没有视野
        prepare: creep => {
            // 只要进入房间则准备结束
            if (creep.room.name !== data.targetRoomName) {
                creep.farMoveTo(new RoomPosition(25, 25, data.targetRoomName))
                return false
            }
            // 进入房间之后运行基地选址规划
            else {
                // 用户没有指定旗帜时才会运行自动规划
                if (!(getName.flagBaseCenter(creep.room.name) in Game.flags)) creep.room.findBaseCenterPos()
                
                return true
            }
        },
        target: creep => {
            // 获取控制器
            const controller = creep.room.controller
            if (!controller) {
                creep.say('控制器呢？')
                return false
            }

            // 绘制所有基地中央待选点位
            creep.room.memory.centerCandidates?.forEach(center => creep.room.visual.circle(...center))

            // 如果控制器不是自己或者被人预定的话就进行攻击
            if ((controller.owner && controller.owner.username !== creep.owner.username) || controller.reservation !== undefined) {
                if (creep.attackController(controller) == ERR_NOT_IN_RANGE) creep.moveTo(controller)
                return false
            }
            
            // 是中立控制器，进行占领
            const claimResult = creep.claimController(controller)
            if (claimResult === ERR_NOT_IN_RANGE) creep.goTo(controller.pos)
            else if (claimResult === OK) {
                creep.log(`新房间 ${data.targetRoomName} 占领成功！已向源房间 ${data.spawnRoom} 请求支援单位`, 'green')

                // 占领成功，发布支援组
                const spawnRoom = Game.rooms[data.spawnRoom]
                if (spawnRoom) spawnRoom.addRemoteHelper(data.targetRoomName)

                // 添加签名
                if (data.signText) creep.signController(controller, data.signText)

                const flag = Game.flags[getName.flagBaseCenter(creep.room.name)]
                // 用户已经指定了旗帜了
                if (flag) {
                    creep.room.setBaseCenter(flag.pos)
                    creep.log(`使用玩家提供的基地中心点，位置 [${flag.pos.x}, ${flag.pos.y}]`, 'green')
                    // 移除旗帜
                    flag.remove()
                }
                // 运行基地选址确认
                else {
                    if (creep.room.memory.centerCandidates.length <= 0) {
                        creep.log(`房间中未找到有效的基地中心点，请放置旗帜并执行 Game.rooms.${creep.room.name}.setcenter('旗帜名')`, 'red')
                    }
                    else {
                        const result = creep.room.confirmBaseCenter()
                        if (result === ERR_NOT_FOUND) creep.log(`新的基地中心点确认失败，请手动指定`, 'yellow')
                        else creep.log(`新的基地中心点已确认, 位置 [${result.x}, ${result.y}]`, 'green')
                    }
                }

                // 执行废弃建筑清理，由 claimer 发起是因为和 controller 发起的 planLayout 错开
                // 如果这俩在一个 tick 调用并且有废弃 spawn 的话会导致没办法正常放置 spawn 工地（建筑销毁实际是在下个 tick 开始时进行）
                const result = creep.room.clearStructure()
                if (result === OK) creep.log(`已清理过期建筑，你可以选择执行 Game.rooms.${creep.room.name}.clearWall() 来清理现存的墙壁`, 'green')

                // 任务完成，一路顺风
                creep.suicide()
            }
            else if (claimResult === ERR_GCL_NOT_ENOUGH) creep.log(`CCL 不足，无法占领`)
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
                creep.farMoveTo(new RoomPosition(25, 25, data.targetRoomName))
                return false
            }
            else return true
        },
        // 一直进行预定
        target: creep => {
            const targetRoom = Game.rooms[data.targetRoomName]
            if (!targetRoom) return false
            const controller = targetRoom.controller
            if (!controller) return false

            // 如果房间的预订者不是自己, 就攻击控制器
            if (controller.reservation && controller.reservation.username !== creep.owner.username) {
                if (creep.attackController(controller) == ERR_NOT_IN_RANGE) creep.farMoveTo(controller.pos, 1)
            }
            // 房间没有预定满, 就继续预定
            if (!controller.reservation || controller.reservation.ticksToEnd < CONTROLLER_RESERVE_MAX) {
                if (creep.reserveController(controller) == ERR_NOT_IN_RANGE) creep.farMoveTo(controller.pos, 1)
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
     */
    signer: (data: RemoteDeclarerData): ICreepConfig => ({
        isNeed: () => false,
        target: creep => {
            if (creep.room.name === data.targetRoomName) {
                if (creep.signController(creep.room.controller, data.signText) === ERR_NOT_IN_RANGE) {
                    creep.goTo(creep.room.controller.pos)
                }
            }
            else creep.farMoveTo(new RoomPosition(25, 25, data.targetRoomName))

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
        isNeed: room => {
            const target = Game.rooms[data.targetRoomName]
            // 如果房间造好了 terminal，自己的使命就完成了
            return remoteHelperIsNeed(room, target, () => target.terminal && target.terminal.my)
        },
        // 向指定房间移动
        prepare: creep => {
            // 只要进入房间则准备结束
            if (creep.room.name !== data.targetRoomName) {
                creep.farMoveTo(new RoomPosition(25, 25, data.targetRoomName))
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

            // 获取有效的能量来源
            let source: StructureStorage | StructureTerminal | StructureContainer | Source
            if (!creep.memory.sourceId) {
                source = creep.room.getAvailableSource()
                creep.memory.sourceId = source.id
            }
            else source = Game.getObjectById(creep.memory.sourceId)
            // 之前的来源建筑里能量不够了就更新来源（如果来源已经是 source 的话就不改了）
            if (!source || (source instanceof Structure && source.store[RESOURCE_ENERGY] < 300)) delete creep.memory.sourceId

            creep.getEngryFrom(source)
        },
        target: creep => {
            // 执行建造之后检查下是不是都造好了，如果是的话这辈子就不会再建造了，等下辈子出生后再检查（因为一千多 tick 基本上不会出现新的工地）
            if (creep.memory.dontBuild) creep.upgrade()
            // 有新墙就先刷新墙
            else if (creep.memory.fillWallId) creep.steadyWall()
            // 没有就建其他工地
            else if (creep.buildStructure() === ERR_NOT_FOUND) creep.memory.dontBuild = true

            if (creep.store.getUsedCapacity() === 0) return true
        },
        bodys: 'worker'
    }),

    /**
     * 支援 - 采矿者
     * 拓展型建造者, 会先抵达指定房间, 然后执行建造者逻辑
     */
    remoteUpgrader: (data: RemoteHelperData): ICreepConfig => ({
        isNeed: room => {
            const target = Game.rooms[data.targetRoomName]
            // 目标房间到 6 了就算任务完成
            return remoteHelperIsNeed(room, target, () =>  target.controller.level >= 6)
        },
        // 向指定房间移动
        prepare: creep => {
            // 只要进入房间则准备结束
            if (creep.room.name !== data.targetRoomName) {
                creep.farMoveTo(new RoomPosition(25, 25, data.targetRoomName))
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

            // 获取有效的能量来源
            let source: StructureStorage | StructureTerminal | StructureContainer | Source
            if (!creep.memory.sourceId) {
                source = creep.room.getAvailableSource()
                creep.memory.sourceId = source.id
            }
            else source = Game.getObjectById(creep.memory.sourceId)
            // 之前的来源建筑里能量不够了就更新来源（如果来源已经是 source 的话就不改了）
            if (!source || (source instanceof Structure && source.store[RESOURCE_ENERGY] < 300)) delete creep.memory.sourceId

            creep.getEngryFrom(source)
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
                room.log(`找不到名称为 ${data.sourceFlagName} 的旗帜`, 'remoteHarvester')
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
                    creep.log(`找不到名称为 ${data.sourceFlagName} 的旗帜`)
                    return false
                }

                // 旗帜所在房间没视野, 就进行移动
                if (!sourceFlag.room) creep.farMoveTo(sourceFlag.pos)
                else {
                    // 缓存外矿房间名
                    sourceFlag.memory.roomName = sourceFlag.room.name
                    const sources = sourceFlag.pos.lookFor(LOOK_SOURCES)
                    if (sources.length <= 0) {
                        creep.log(`${data.sourceFlagName} 附近没有找到 source`)
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
                creep.log(`找不到名称为 ${data.sourceFlagName} 的旗帜`)
                return false
            }

            // 掉血了就说明被攻击了，直接投降，告诉基地 1500 之后再孵化我
            if (creep.hits < creep.hitsMax) {
                const room = Game.rooms[data.spawnRoom]
                if (!room) {
                    creep.log(`找不到 ${data.spawnRoom}`)
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
                        creep.log(`找不到 ${data.spawnRoom}`)
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
                creep.farMoveTo(sourceFlag.pos)
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
                creep.log(`找不到存放建筑 ${data.targetId}`, 'yellow')
                return false
            }
            
            // 再把剩余能量运回去
            const result = creep.transfer(target, RESOURCE_ENERGY)
            // 报自己身上资源不足了就说明能量放完了
            if (result === ERR_NOT_ENOUGH_RESOURCES) return true
            else if (result === ERR_NOT_IN_RANGE) creep.farMoveTo(target.pos, 1)
            else if (result === ERR_FULL) creep.say('满了啊')
            else if (result !== OK) creep.log(`target 阶段 transfer 出现异常，错误码 ${result}`, 'red')

            return false
        },
        bodys: 'remoteHarvester'
    }),

    /**
     * deposit 采集者
     * 从指定矿中挖 deposit > 将挖出来的资源转移到建筑中
     * 
     * @property {} sourceFlagName 旗帜名，要插在 deposit 上
     * @property {} spawnRoom 出生房间名
     */
    depositHarvester: (data: RemoteHarvesterData): ICreepConfig => ({
        isNeed: room => {
            // 旗帜效验, 没有旗帜则不生成
            const targetFlag = Game.flags[data.sourceFlagName]
            if (!targetFlag) return false

            // 冷却时长过长则放弃该 deposit
            if (targetFlag.memory.depositCooldown >= DEPOSIT_MAX_COOLDOWN) {
                targetFlag.remove()
                return false
            }
            return true
        },
        source: creep => {
            // 旗帜效验, 没有旗帜则原地待命
            const targetFlag = Game.flags[data.sourceFlagName]
            if (!targetFlag) {
                creep.log(`找不到名称为 ${data.sourceFlagName} 的旗帜，creep 已移除`)
                creep.suicide()
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

                creep.farMoveTo(targetFlag.pos, 1)

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
                creep.log(`[${creep.name}] 找不到存放建筑`, 'yellow')
                return false
            }

            // 转移并检测返回值
            const result = creep.transfer(room.terminal, creep.memory.depositType)
            if (result === OK || result === ERR_NOT_ENOUGH_RESOURCES) {
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
            if (result === ERR_NOT_IN_RANGE) creep.farMoveTo(room.terminal.pos, 1)
            else if (result === ERR_INVALID_ARGS) return true
            else creep.say(`转移 ${result}`)
        },
        bodys: 'remoteHarvester'
    }),

    /**
     * PowerBank 攻击单位
     * 移动并攻击 powerBank, 请在 8 级时生成
     * @see doc "../doc/PB 采集小组设计案"
     * 
     * @property {} sourceFlagName 旗帜名，要插在 powerBank 上
     */
    pbAttacker: (data: pbAttackerData): ICreepConfig => ({
        prepare: creep => {
            const targetFlag = Game.flags[data.sourceFlagName]
            if (!targetFlag) {
                creep.say('旗呢？')
                // 移除采集小组
                removeSelfGroup(creep, data.healerCreepName, data.spawnRoom)
                return false
            }

            // 朝目标移动
            creep.farMoveTo(targetFlag.pos, 1)

            let findPowerbank = true
            // 进入房间后搜索 pb 并缓存
            if (creep.room.name === targetFlag.pos.roomName) {
                // 有缓存了就验证下
                if (targetFlag.memory.sourceId) {
                    const pb = Game.getObjectById(targetFlag.memory.sourceId)
                    if (!pb) findPowerbank = false
                }
                // 没缓存就查找 pb
                else {
                    const powerbank = _.find(targetFlag.pos.lookFor(LOOK_STRUCTURES), s => s.structureType === STRUCTURE_POWER_BANK) as StructurePowerBank
                    // 并写入缓存
                    if (powerbank) targetFlag.memory.sourceId = powerbank.id
                    // 没找到说明已经没了
                    else findPowerbank = false
                }
            }

            // 没找到目标，任务失败
            if (!findPowerbank) {
                targetFlag.remove()
                // 移除采集小组
                removeSelfGroup(creep, data.healerCreepName, data.spawnRoom)
                return false
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
                removeSelfGroup(creep, data.healerCreepName, data.spawnRoom)
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

            // 找不到 pb 了
            if (!powerbank) {
                // 发现废墟，pb 成功摧毁，进入下个阶段
                if (targetFlag.pos.lookFor(LOOK_RUINS).length > 0) {
                    targetFlag.memory.state = PB_HARVESTE_STATE.TRANSFER
                }
                // 未能成功在 pb 消失前将其摧毁，任务失败，移除旗帜
                else targetFlag.remove()
                
                // 移除采集小组
                removeSelfGroup(creep, data.healerCreepName, data.spawnRoom)
                return false
            }

            const attackResult = creep.attack(powerbank)

            // 如果血量低于标准了，则通知运输单位进行提前生成
            if (attackResult === OK) {
                /**
                 * @danger 注意下面这个计算式是固定两组在采集时的准备时间计算，如果更多单位一起开采的话会出现 pb 拆完但是 manager 还没到位的情况发生
                 * 下面这个 150 是 pbCarrier 的孵化时间，50 为冗余时间，600 是 attacker 的攻击力，2 代表两组同时攻击
                 */
                if ((targetFlag.memory.state != PB_HARVESTE_STATE.PREPARE) && (powerbank.hits <= (targetFlag.memory.travelTime + 150 + 50) * 600 * 2)) {
                    // 发布运输小组
                    const spawnRoom = Game.rooms[data.spawnRoom]
                    if (!spawnRoom) {
                        creep.say('家呢？')
                        return false
                    }

                    // 下面这个 1600 是 [ CARRY: 32, MOVE: 16 ] 的 pbCarrier 的最大运输量
                    spawnRoom.spawnPbCarrierGroup(data.sourceFlagName, Math.ceil(powerbank.power / 1600))

                    // 设置为新状态
                    targetFlag.memory.state = PB_HARVESTE_STATE.PREPARE
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
     * @todo 治疗的时候应该禁止对穿的，现在没禁止有可能出现两个 healer 选在一个位置疯狂对穿。但是机率不大，不写了。
     * 
     * @property {} creepName 要治疗的 pbAttacker 的名字
     */
    pbHealer: (data: HealUnitData): ICreepConfig => ({
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
     */
    pbCarrier: (data: RemoteHarvesterData): ICreepConfig => ({
        // carrier 并不会重复生成
        isNeed: () => false,
        // 移动到目标三格之内就算准备完成
        prepare: creep => {
            const targetFlag = Game.flags[data.sourceFlagName]
            if (!targetFlag) {
                creep.suicide()
                return false
            }

            creep.farMoveTo(targetFlag.pos)

            return creep.pos.inRangeTo(targetFlag.pos, 3)
        },
        source: creep => {
            const targetFlag = Game.flags[data.sourceFlagName]
            if (!targetFlag) {
                creep.suicide()
                return false
            }
            // 没到搬运的时候就先待命
            if (targetFlag.memory.state !== PB_HARVESTE_STATE.TRANSFER) return false
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
                // 地上也没了那就上天堂
                else creep.suicide()
            }
        },
        target: creep => {
            // 获取资源运输目标房间并兜底
            const room = Game.rooms[data.spawnRoom]
            if (!room || !room.terminal) {
                creep.log(`找不到 terminal`, 'yellow')
                return false
            }
            
            // 存放资源
            const result = creep.transfer(room.terminal, RESOURCE_POWER)
            // 存好了就直接自杀并移除旗帜
            if (result === OK) {
                const targetFlag = Game.flags[data.sourceFlagName]
                targetFlag && targetFlag.remove()
                creep.suicide()

                // 通知 terminal 进行 power 平衡
                room.terminal.balancePower()

                return true
            }
            else if (result === ERR_NOT_IN_RANGE) creep.farMoveTo(room.terminal.pos)
        },
        bodys: calcBodyPart({ [CARRY]: 32, [MOVE]: 16 })
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
                creep.log(`找不到 ${data.sourceFlagName} 旗帜`, 'yellow')
                creep.say('旗呢？')
                return false
            }
            let cost1 = Game.cpu.getUsed()
            creep.farMoveTo(targetFlag.pos)
            creep.log(`移动消耗 ${Game.cpu.getUsed() - cost1}`)

            return false
        },
        bodys: [ MOVE ]
    }),
}

/**
 * pbAttacker 移除自身采集小组并自杀的封装
 * 
 * @param creep pbAttacker
 * @param healerName 治疗单位名称
 * @param spawnRoomName 出生房间名
 * @returns 是否移除成功
 */
const removeSelfGroup = function(creep: Creep, healerName: string, spawnRoomName: string): boolean {
    // 移除自己和 heal 的配置项
    const spawnRoom = Game.rooms[spawnRoomName]
    if (!spawnRoom) {
        creep.say('家呢？')
        return false
    }
    /**
     * @danger 这里 Healer 的名称应该与发布时保持一致，但是这里并没有强相关，在 oberserver 发布角色组的代码里如果修改了 healer 的名称的话这里就会出问题
     */
    spawnRoom.removePbHarvesteGroup(creep.name, healerName)

    // 自杀并释放采集位置
    creep.suicide()
    creep.room.removeRestrictedPos(creep.name)
}

/**
 * 远程支援单位的 isNeed 阶段
 * 
 * @param source 来源房间
 * @param target 被支援的房间
 * @param customCondition 自定义判断条件
 */
const remoteHelperIsNeed = function(source: Room, target: Room, customCondition: () => boolean): boolean {
    // 源房间没视野就默认孵化
    if (!target) return true

    if (
        // 判断自定义条件
        customCondition() ||
        // 源房间还不够 7 级并且目标房间的 spawn 已经造好了
        (source.controller?.level < 7 && target.find(FIND_MY_SPAWNS).length > 0)
    ) return false

    return true
}

export default roles