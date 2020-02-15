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
                target = <StructureExtension>Game.getObjectById(creep.memory.fillStructureId)

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
                    target = Game.getObjectById(data.targetId)
                    if (!target) return 
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
                creep.moveTo(Game.getObjectById<Source>(data.sourceId), { reusePath: 20 })
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

            if (creep.harvest(source) == ERR_NOT_IN_RANGE) creep.moveTo(source, { reusePath: 20 })
        },
        target: creep => {
            const target: Structure = data.targetId ? Game.getObjectById(data.targetId) : creep.room.storage
            if (!target) {
                creep.say('目标找不到!')
                return false
            }

            if (creep.transfer(target, Object.keys(creep.store)[0] as ResourceConstant) == ERR_NOT_IN_RANGE) creep.moveTo(target, { reusePath: 20 })

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
            if (room.mineral.mineralAmount <= 0) return false

            // 再检查下 terminal 是否已经满了
            if (!room.terminal || room.terminal.store.getFreeCapacity() <= 0) return false
            else return true
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
            else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return true

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
            const target: Structure = data.targetId ? Game.getObjectById(data.targetId) : creep.room.terminal
            if (!target) {
                creep.say('放哪啊！')
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
        isNeed: room => {
            const source = Game.getObjectById(data.sourceId)
            if (!source) {
                console.log(`[生成挂起] ${room.name} upgrader 中的 ${data.sourceId} 不是一个有效的能量来源`)
                return false
            }

            // 八级时只有降级倒计时低于 100000 时才会生成
            if (room.controller.level === 8 && room.controller.ticksToDowngrade > 100000) return false

            return true
        },
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
     * 维修者
     * 从指定结构中获取能量 > 维修房间内的建筑
     * 注：目前维修者更适合在能量爆仓或者敌人攻城时使用
     * 
     * @param spawnRoom 出生房间名称
     * @param sourceId 要挖的矿 id
     */
    repairer: (data: WorkerData): ICreepConfig => ({
        source: creep => {
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return true
            creep.getEngryFrom(Game.getObjectById(data.sourceId))
        },
        // 一直修墙就完事了
        target: creep => {
            creep.fillDefenseStructure()

            if (creep.store.getUsedCapacity() === 0) return true
        },
        bodys: 'worker'
    })
}

export default roles