import { minerHervesteLimit, ROOM_TRANSFER_TASK } from 'setting'
import { getRoomTransferTask, transferTaskOperations } from './advanced'

/**
 * 初级房间运维角色组
 * 本角色组包括了在没有 Storage 和 Link 的房间内运维所需的角色
 */
const roles: {
    [role in BaseRoleConstant]: (data: CreepData) => ICreepConfig
} = {
    /**
     * 采集者
     * 从指定 source 中获取能量 > 将能量存放到身下的 container 中
     */
    harvester: (data: HarvesterData): ICreepConfig => ({
        // 向 container 或者 source 移动
        // 在这个阶段中，targetId 是指 container 或 conatiner 的工地或 source
        prepare: creep => {
            let target: StructureContainer | Source | ConstructionSite
            // 如果有缓存的话就获取缓存
            if (creep.memory.targetId) target = Game.getObjectById<StructureContainer | Source>(creep.memory.sourceId)
            const source = Game.getObjectById<Source>(data.sourceId)

            // 没有缓存或者缓存失效了就重新获取
            if (!target) {
                // 先尝试获取 container
                const containers = source.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER
                })

                // 找到了就把 container 当做目标
                if (containers.length > 0) target = containers[0]
            }

            // 还没找到就找 container 的工地
            if (!target) {
                const constructionSite = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER
                })

                if (constructionSite.length > 0) target = constructionSite[0]
            }

            // 如果还是没找到的话就用 source 当作目标
            if (!target) target = source
            creep.memory.targetId = target.id

            // 设置移动范围并进行移动（source 走到附近、container 和工地就走到它上面）
            const range = target instanceof Source ? 1 : 0
            creep.goTo(target.pos, range)

            // 抵达位置了就准备完成
            if (creep.pos.inRangeTo(target.pos, range)) return true
            return false
        },
        // 因为 prepare 准备完之后会先执行 source 阶段，所以在这个阶段里对 container 进行维护
        // 在这个阶段中，targetId 仅指 container
        source: creep => {
            creep.say('🚧')

            // 没有能量就进行采集，因为是维护阶段，所以允许采集一下工作一下
            if (creep.store[RESOURCE_ENERGY] <= 0) {
                creep.getEngryFrom(Game.getObjectById(data.sourceId))
                return false
            }
            
            // 获取 prepare 阶段中保存的 targetId
            let target = Game.getObjectById<StructureContainer | Source>(creep.memory.targetId)

            // 存在 container，把血量修满
            if (target && target instanceof StructureContainer) {
                creep.repair(target)
                // 血修满了就正式进入采集阶段
                return target.hits >= target.hitsMax
            }

            // 不存在 container，开始新建，首先尝试获取工地缓存，没有缓存就新建工地
            let constructionSite: ConstructionSite
            if (!creep.memory.constructionSiteId) creep.pos.createConstructionSite(STRUCTURE_CONTAINER)
            else constructionSite = Game.getObjectById<ConstructionSite>(creep.memory.constructionSiteId)

            // 没找到工地缓存或者工地没了，重新搜索
            if (!constructionSite) constructionSite = creep.pos.lookFor(LOOK_CONSTRUCTION_SITES).find(s => s.structureType === STRUCTURE_CONTAINER)

            // 还没找到就说明有可能工地已经建好了，进行搜索
            if (!constructionSite) {
                const container = creep.pos.lookFor(LOOK_STRUCTURES).find(s => s.structureType === STRUCTURE_CONTAINER)

                // 找到了造好的 container 了，添加进房间
                if (container) {
                    creep.room.registerContainer(container as StructureContainer)
                    return true
                }

                // 还没找到，等下个 tick 会重新新建工地
                return false
            }
            // 找到了就缓存 id
            else creep.memory.constructionSiteId = constructionSite.id

            creep.build(constructionSite)
        },
        // 采集阶段会无脑采集，过量的能量会掉在 container 上然后被接住存起来
        target: creep => {
            creep.getEngryFrom(Game.getObjectById(data.sourceId))

            // 快死了就把身上的能量丢出去，这样就会存到下面的 container 里，否则变成墓碑后能量无法被 container 自动回收
            if (creep.ticksToLive < 2) creep.drop(RESOURCE_ENERGY)
            return false
        },
        bodys: 'harvester'
    }),

    /**
     * 收集者
     * 从指定 source 中获取资源 > 将资源转移到指定建筑中
     */
    collector: (data: HarvesterData): ICreepConfig => ({
        prepare: creep => {
            // 已经到附近了就准备完成
            if (creep.pos.isNearTo((<Structure>Game.getObjectById(data.sourceId)).pos)) return true
            // 否则就继续移动
            else {
                creep.goTo(Game.getObjectById<Source>(data.sourceId).pos)
                return false
            }
        },
        source: creep => {
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return true

            const source = Game.getObjectById<Source>(data.sourceId)
            if (!source) {
                creep.say('目标找不到!')
                return false
            }

            const result = creep.harvest(source)

            // harvest 需要长时间占用该位置，所以需要禁止对穿
            if (result === OK) {
                // 开始采集能量了就拒绝对穿
                if (!creep.memory.standed) {
                    creep.room.addRestrictedPos(creep.name, creep.pos)
                    creep.memory.standed = true
                }
            }
            else if (result === ERR_NOT_IN_RANGE) creep.goTo(source.pos)
            else if (result === ERR_NOT_ENOUGH_RESOURCES) {
                // 如果满足下列条件就重新发送 regen_source 任务
                if (
                    // creep 允许重新发布任务
                    (!creep.memory.regenSource || creep.memory.regenSource < Game.time) &&
                    // source 上没有效果
                    (!source.effects || !source.effects[PWR_REGEN_SOURCE])
                ) {
                    // 并且房间内的 pc 支持这个任务
                    if (creep.room.memory.powers && creep.room.memory.powers.split(' ').includes(String(PWR_REGEN_SOURCE))) {
                        // 添加 power 任务，设置重新尝试时间
                        creep.room.addPowerTask(PWR_REGEN_SOURCE)
                        creep.memory.regenSource = Game.time + 300
                    }
                    else creep.memory.regenSource = Game.time + 1000
                }
            }

            // 快死了就把能量移出去
            if (creep.ticksToLive <= 3) return true
        },
        target: creep => {
            const target: Structure = Game.getObjectById(data.targetId)
            // 找不到目标了，自杀并重新运行发布规划
            if (!target) {
                creep.say('目标找不到!')
                creep.room.releaseCreep('harvester')
                creep.suicide()
                return false
            }

            if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) creep.goTo(target.pos)

            if (creep.store.getUsedCapacity() === 0) return true
        },
        bodys: 'worker'
    }),

    /**
     * 矿工
     * 从房间的 mineral 中获取资源 > 将资源转移到指定建筑中(默认为 terminal)
     */
    miner: (data: HarvesterData): ICreepConfig => ({
        // 检查矿床里是不是还有矿
        isNeed: room => {
            // 房间中的矿床是否还有剩余产量
            if (room.mineral.mineralAmount <= 0) {
                room.memory.mineralCooldown = Game.time + MINERAL_REGEN_TIME
                return false
            }

            // 再检查下终端存储是否已经太多了, 如果太多了就休眠一段时间再出来看看
            if (!room.terminal || room.terminal.store.getUsedCapacity() >= minerHervesteLimit) {
                room.memory.mineralCooldown = Game.time + 10000
                return false
            }
            
            return true
        },
        prepare: creep => {
            creep.goTo(creep.room.mineral.pos)

            // 如果移动到了就准备完成并保存移动时间
            if (creep.pos.isNearTo(creep.room.mineral.pos)) {
                creep.memory.travelTime = CREEP_LIFE_TIME - creep.ticksToLive
                return true
            }

            return false
        },
        source: creep => {
            if (creep.ticksToLive <= creep.memory.travelTime + 30) return true
            else if (creep.store.getFreeCapacity() === 0) return true

            // 采矿
            const harvestResult = creep.harvest(creep.room.mineral)

            // 开始采矿了就注册禁止对穿
            if (harvestResult === OK && !creep.memory.standed) {
                creep.memory.standed = true
                creep.room.addRestrictedPos(creep.name, creep.pos)
            }
            else if (harvestResult === ERR_NOT_IN_RANGE) creep.goTo(creep.room.mineral.pos)
        },
        target: creep => {
            const target: StructureTerminal = creep.room.terminal
            if (!target) {
                creep.say('放哪？')
                return false
            }
            // 转移/移动
            if (creep.transfer(target, Object.keys(creep.store)[0] as ResourceConstant) == ERR_NOT_IN_RANGE) creep.goTo(target.pos)

            if (creep.store.getUsedCapacity() === 0) return true
        },
        bodys: 'worker'
    }),

    /**
     * 填充单位
     * 从 container 中获取能量 > 执行房间物流任务
     * 在空闲时间会尝试把能量运输至 storage
     */
    filler: (data: WorkerData): ICreepConfig => ({
        // 能量来源（container）没了就自觉放弃
        isNeed: room => {
            // 这里调用 room.sourceContainers 可以移除掉过期的 container id
            return !!room.sourceContainers.find(container => container.id === data.sourceId)
        },
        // 一直尝试从 container 里获取能量，不过拿到了就走
        source: creep => {
            if (creep.store[RESOURCE_ENERGY] > 0) return true

            // 获取源 container
            let source: StructureContainer | StructureStorage = Game.getObjectById<StructureContainer>(data.sourceId)
            // container 没能量了就尝试从 storage 里获取能量执行任务
            // 原因是有了 sourceLink 之后 container 会有很长一段时间没人维护（直到 container 耐久掉光）
            // 如果没有这个判断的话 filler 会在停止孵化之前有好几辈子都呆在空 container 前啥都不干
            if (!source || source.store[RESOURCE_ENERGY] <= 0) source = creep.room.storage

            creep.getEngryFrom(source)
        },
        // 维持房间能量填充
        target: creep => {
            const task = getRoomTransferTask(creep.room)

            // 只会执行能量填充任务
            if (task && (task.type === ROOM_TRANSFER_TASK.FILL_EXTENSION || task.type === ROOM_TRANSFER_TASK.FILL_TOWER)) {
                return transferTaskOperations[task.type].target(creep, task)
            }
            
            // 空闲时间会尝试把能量存放到 storage 里
            if (!creep.room.storage) return false

            const source = Game.getObjectById<StructureContainer>(data.sourceId)
            // source container 还有 harvester 维护时才会把能量转移至 storage
            // 否则结合 source 阶段，filler 会在 container 等待老化时在 storage 旁边无意义举重
            if (source && source.store[RESOURCE_ENERGY] > 0) creep.transferTo(creep.room.storage, RESOURCE_ENERGY)
            else creep.say('💤')

            if (creep.store[RESOURCE_ENERGY] <= 0) return true
        },
        bodys: 'manager'
    }),

    /**
     * 升级者
     * 不会采集能量，只会从指定目标获取能量
     * 从指定建筑中获取能量 > 升级 controller
     */
    upgrader: (data: WorkerData): ICreepConfig => ({
        source: creep => {
            // 因为只会从建筑里拿，所以只要拿到了就去升级
            if (creep.store[RESOURCE_ENERGY] > 0) return true

            const source: StructureTerminal | StructureStorage | StructureContainer = Game.getObjectById(data.sourceId)

            // 如果能量来源是 container
            if (source && source.structureType === STRUCTURE_CONTAINER) {
                // 完全没能量很少见，可能是边上有 link 了（这时候 harvester 会把能量存到 link 里，就不再用 container 了）
                // 所以这里需要特殊判断一下，避免 upgrader 对着一个空的 container 发呆好几辈子
                if (source.store[RESOURCE_ENERGY] === 0) {
                    const nearLinks = source.pos.findInRange(FIND_MY_STRUCTURES, 1, {
                        filter: s => s.structureType === STRUCTURE_LINK
                    })
                    // 已经造好 link 了，废弃空 container
                    if (nearLinks.length > 0) {
                        source.destroy()
                        return false
                    }
                }
                // 有能量但是太少，就等到其中能量大于指定数量再拿（优先满足 filler 的能量需求）
                else if (source.store[RESOURCE_ENERGY] <= 500) return false
            }

            // 获取能量
            const result = creep.getEngryFrom(source)

            // 能量来源无法提供能量了, 自杀并重新运行 upgrader 发布规划, 从 Link 里获取能量的话，就不会重新运行规划
            if (
                (result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_INVALID_TARGET) &&
                (!source || source instanceof StructureTerminal || source instanceof StructureStorage)
            ) {
                creep.room.releaseCreep('upgrader')
                creep.suicide()
            }
        },
        target: creep => {
            if (creep.upgrade() === ERR_NOT_ENOUGH_RESOURCES) return true
        },
        bodys: 'upgrader'
    }),

    /**
     * 建筑者
     * 只有在有工地时才会生成
     * 从指定结构中获取能量 > 查找建筑工地并建造
     * 
     * @param spawnRoom 出生房间名称
     * @param sourceId 要挖的矿 id
     */
    builder: (data: WorkerData): ICreepConfig => ({
        // 工地都建完就就使命完成
        isNeed: room => {
            const targets: ConstructionSite[] = room.find(FIND_MY_CONSTRUCTION_SITES)
            return targets.length > 0 ? true : false
        },
        // 把 data 里的 sourceId 挪到外边方便修改
        prepare: creep => {
            creep.memory.sourceId = data.sourceId
            return true
        },
        // 根据 sourceId 对应的能量来源里的剩余能量来自动选择新的能量来源
        source: creep => {
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return true

            // 获取有效的能量来源
            let source: StructureStorage | StructureTerminal | StructureContainer | Source
            if (!creep.memory.sourceId) {
                source = creep.room.getAvailableSource()
                creep.memory.sourceId = source.id
            }
            else source = Game.getObjectById(creep.memory.sourceId)

            // 之前用的能量来源没能量了就更新来源
            if (creep.getEngryFrom(source) === ERR_NOT_ENOUGH_RESOURCES) delete creep.memory.sourceId
        },
        target: creep => {
            // 有新墙就先刷新墙
            if (creep.memory.fillWallId) creep.steadyWall()
            // 没有就建其他工地
            else if (creep.buildStructure() !== ERR_NOT_FOUND) { }
            // 工地也没了就去升级
            else if (creep.upgrade()) { }

            if (creep.store.getUsedCapacity() === 0) return true
        },
        bodys: 'worker'
    }),

    /**
     * 维修者
     * 从指定结构中获取能量 > 维修房间内的建筑
     * 主要用途：
     * 在低等级时从 container 中拿能量刷墙（container 消失后自动移除）
     * 在敌人进攻时孵化并针对性刷墙
     * 在解决能量爆仓问题（暂未开发）
     * 
     * @param spawnRoom 出生房间名称
     * @param sourceId 要挖的矿 id
     */
    repairer: (data: WorkerData): ICreepConfig => ({
        // 根据敌人威胁决定是否继续生成
        isNeed: room => {
            const source = Game.getObjectById(data.sourceId)

            // 如果能量来源没了就删除自己
            if (!source) return false
            // 如果能量来源是 container 的话说明还在发展期，只要 container 在就一直孵化
            else if (source && source instanceof StructureContainer) return true

            // 否则就看当前房间里有没有威胁，有的话就继续孵化并刷墙
            return room.controller.checkEnemyThreat()
        },
        source: creep => {
            const source = Game.getObjectById<StructureContainer>(data.sourceId) || creep.room.storage || creep.room.terminal
            // 能量不足就先等待，优先满足 filler 需求
            if (source.store[RESOURCE_ENERGY] < 500) return false
            creep.getEngryFrom(source)

            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return true
        },
        // 一直修墙就完事了
        target: creep => {
            let importantWall = creep.room._importantWall
            // 先尝试获取焦点墙，有最新的就更新缓存，没有就用缓存中的墙
            if (importantWall) creep.memory.fillWallId = importantWall.id
            else if (creep.memory.fillWallId) importantWall = Game.getObjectById(creep.memory.fillWallId)

            // 有焦点墙就优先刷
            if (importantWall) {
                const actionResult = creep.repair(creep.room._importantWall)
                if (actionResult === OK) {
                    if (!creep.memory.standed) {
                        creep.memory.standed = true
                        creep.room.addRestrictedPos(creep.name, creep.pos)
                    }

                    // 离墙三格远可能正好把路堵上，所以要走进一点
                    if (!creep.room._importantWall.pos.inRangeTo(creep.pos, 2)) creep.goTo(creep.room._importantWall.pos)
                }
                else if (actionResult == ERR_NOT_IN_RANGE) creep.goTo(creep.room._importantWall.pos)
            }
            // 否则就按原计划维修
            else creep.fillDefenseStructure()

            if (creep.store.getUsedCapacity() === 0) return true
        },
        bodys: 'worker'
    })
}

export default roles