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
        // 在这个阶段中，targetId 是指 container 或 source
        prepare: creep => {
            let target: StructureContainer | Source
            // 如果有缓存的话就获取缓存
            if (creep.memory.targetId) target = Game.getObjectById<StructureContainer | Source>(creep.memory.sourceId)

            // 没有缓存或者缓存失效了就重新获取
            if (!target) {
                // 先尝试获取 container
                const containers = creep.room.find<StructureContainer>(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER
                })

                // 找到了就把 container 当做目标
                if (containers.length > 0) target = containers[0]
                // 否则就把 source 当做目标
                else target = Game.getObjectById<Source>(data.sourceId)

                // 进行缓存
                creep.memory.targetId = target.id
            }

            // 如果还是没找到的话就提示
            if (!target) {
                creep.say('找不到目标')
                return false
            }

            // 设置移动范围并进行移动（source 走到附近、container 就走到它上面）
            const range = target instanceof Source ? 1 : 0
            creep.goTo(target.pos, range)

            // 抵达位置了就准备完成
            if (creep.pos.inRangeTo(target.pos, range)) return true
            return false
        },
        // 因为 prepare 准备完之后会先执行 source 阶段，所以在这个阶段里对 container 进行维护
        // 在这个阶段中，targetId 仅指 container
        source: creep => {
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
                // 找到了，重新发布 creep 并进入采集阶段
                if (container) {
                    creep.room.releaseCreep('filler')
                    creep.room.releaseCreep('upgrader')
                    return true
                }

                // 还没找到，等下个 tick 会重新新建工地
                creep.say('找不到工地')
                return false
            }

            creep.build(constructionSite)
        },
        // 采集阶段会无脑采集，过量的能量会掉在 container 上然后被接住存起来
        target: creep => {
            creep.getEngryFrom(Game.getObjectById(data.sourceId))
            return false
        },
        bodys: 'worker'
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

            const actionResult = creep.harvest(source)

            if (actionResult === ERR_NOT_IN_RANGE) creep.goTo(source.pos)
            else if (actionResult === ERR_NOT_ENOUGH_RESOURCES) {
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
        isNeed: () => {
            return !!Game.getObjectById(data.sourceId)
        },
        // 一直尝试从 container 里获取能量，不过拿到了就走
        source: creep => {
            if (creep.store[RESOURCE_ENERGY] > 0) return true
            creep.getEngryFrom(Game.getObjectById(data.sourceId))
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
            creep.transferTo(creep.room.storage, RESOURCE_ENERGY)
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
            const source: StructureTerminal | StructureStorage | StructureContainer = Game.getObjectById(data.sourceId)

            // 如果来源是 container 的话就等到其中能量大于指定数量再拿（优先满足 filler 的能量需求）
            if (source && source.structureType === STRUCTURE_CONTAINER && source.store[RESOURCE_ENERGY] <= 500) return false

            // 获取能量
            const result = creep.getEngryFrom(source)
            // 但如果是 Container 或者 Link 里获取能量的话，就不会重新运行规划
            if (
                (result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_INVALID_TARGET) && 
                (source instanceof StructureTerminal || source instanceof StructureStorage)
            ) {
                // 如果发现能量来源（建筑）里没有能量了，就自杀并重新运行 upgrader 发布规划
                creep.room.releaseCreep('upgrader')
                creep.suicide()
            }

            // 因为是从 container 里拿，所以只要拿到了就去升级
            if (creep.store[RESOURCE_ENERGY] > 0) return true
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
        isNeed: room => {
            const targets: ConstructionSite[] = room.find(FIND_MY_CONSTRUCTION_SITES)
            return targets.length > 0 ? true : false
        },
        source: creep => {
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return true

            // 获取有效的能量来源
            let source: StructureStorage | StructureTerminal | Source
            if (!creep.memory.sourceId) {
                source = creep.room.getAvailableSource()
                creep.memory.sourceId = source.id
            }
            else source = Game.getObjectById(creep.memory.sourceId)

            // 之前用的能量来源没能量了就更新来源（如果来源已经是 source 的话就改了）
            if (creep.getEngryFrom(source) === ERR_NOT_ENOUGH_RESOURCES && source instanceof Structure) delete creep.memory.sourceId
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
     * 注：目前维修者只会在敌人攻城时使用
     * 
     * @param spawnRoom 出生房间名称
     * @param sourceId 要挖的矿 id
     */
    repairer: (data: WorkerData): ICreepConfig => ({
        // 根据敌人威胁决定是否继续生成
        isNeed: room => room.controller.checkEnemyThreat(),
        source: creep => {
            creep.getEngryFrom(Game.getObjectById(data.sourceId) || creep.room.storage || creep.room.terminal)

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