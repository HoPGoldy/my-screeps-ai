import { minerHervesteLimit } from './setting'

/**
 * 初级房间运维角色组
 * 本角色组包括了在没有 Storage 和 Link 的房间内运维所需的角色
 */
const roles: {
    [role in BaseRoleConstant]: (data: CreepData) => ICreepConfig
} = {
    /**
     * 采集者
     * 从指定 source 中获取能量 > 将矿转移到 spawn 和 extension 中
     */
    harvester: (data: HarvesterData): ICreepConfig => ({
        source: creep => {
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return true
            creep.getEngryFrom(Game.getObjectById(data.sourceId))
        },
        target: creep => {
            let target: AnyStructure

            // 有缓存就用缓存
            if (creep.memory.fillStructureId) {
                target = <StructureTower>Game.getObjectById(creep.memory.fillStructureId)

                // 如果 tower 填到 800 以上或者 spwan extension 填满就移除
                if ((target instanceof StructureTower && target.store[RESOURCE_ENERGY] < 800) || target.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                    delete creep.memory.fillStructureId
                    target = undefined
                }
            }

            if (!target) {
                // 找需要填充能量的建筑
                let targets: AnyStructure[] = creep.room.find(FIND_STRUCTURES, {
                    filter: s => {
                        // 是否有目标 extension 和 tower
                        const hasTargetSpawn = (s.structureType == STRUCTURE_EXTENSION || s.structureType == STRUCTURE_SPAWN) && 
                            (s.store[RESOURCE_ENERGY] < s.energyCapacity)
                        // 是否有目标 tower
                        const hasTargetTower = (s.structureType == STRUCTURE_TOWER) && 
                            (s.store[RESOURCE_ENERGY] < 800)
                        
                        return hasTargetSpawn || hasTargetTower
                    }
                })

                // 有目标的话就找到最近的
                if (targets.length > 0) {
                    target = creep.pos.findClosestByRange(targets)
                    // 写入缓存
                    creep.memory.fillStructureId = target.id
                }
                // 能量都已经填满就尝试获取冗余存储
                else {
                    if (data.targetId === '') return 
                    target = Game.getObjectById<StructureStorage | StructureTerminal | StructureContainer>(data.targetId)
                    if (!target || target.store.getFreeCapacity(RESOURCE_ENERGY) <= 0) return 
                }
            }

            // 将能量移送至目标建筑
            creep.transferTo(target, RESOURCE_ENERGY)

            if (creep.store.getUsedCapacity() === 0) return true
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
     * 升级者
     * 只有在 sourceId 是 storage 并且其能量足够多时才会生成
     * 从 Source 中采集能量一定会生成
     * 从指定结构中获取能量 > 将其转移到本房间的 Controller 中
     */
    upgrader: (data: WorkerData): ICreepConfig => ({
        source: creep => {
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return true
            const source: StructureTerminal | StructureStorage | Source = Game.getObjectById(data.sourceId)

            // 如果发现能量来源（建筑）里没有能量了，就自杀并重新运行 upgrader 发布规划
            const result = creep.getEngryFrom(source)
            if ((result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_INVALID_TARGET) && source instanceof Structure) {
                creep.room.releaseCreep('upgrader')
                creep.suicide()
            }
        },
        target: creep => {
            creep.upgrade()
            if (creep.store.getUsedCapacity() === 0) return true
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