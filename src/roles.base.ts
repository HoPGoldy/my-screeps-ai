/**
 * upgrader 只有在能量来源大于下面定义的下限时才会生成
 * 例如：从 container 获取能量时，该 container 的能量必须大于 500 才会生成该 upgrader
 */
export const upgraderEnergyLimit = {
    [STRUCTURE_CONTAINER]: 500,
    [STRUCTURE_STORAGE]: 10000,
    [STRUCTURE_TERMINAL]: 0
}

/**
 * 初级房间运维角色组
 * 本角色组包括了在没有 Storage 和 Link 的房间内运维所需的角色
 */
export default {
    /**
     * 采集者
     * 从指定 source 中获取能量 > 将矿转移到 spawn 和 extension 中
     * 
     * @param spawnName 出生点名称
     * @param sourceId 要挖的矿 id
     * @param backupStorageId 填满后将能量转移到的建筑 (可选)
     */
    harvester: (spawnName: string, sourceId: string, backupStorageId: string=''): ICreepConfig => ({
        source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
        target: creep => creep.fillSpawnEngry(backupStorageId),
        switch: creep => creep.updateState('🍚 收获'),
        spawn: spawnName,
        bodyType: 'worker'
    }),

    /**
     * 收集者
     * 从指定 source 或 mineral 中获取资源 > 将资源转移到指定建筑中
     * 
     * @param spawnName 出生点名称
     * @param sourceId 要挖的矿 id
     * @param targetId 指定建筑 id (默认为 room.storage)
     */
    collector: (spawnName: string, sourceId: string, targetId: string=''): ICreepConfig => ({
        prepare: creep => creep.moveTo(<Source | Mineral>Game.getObjectById(sourceId), { reusePath: 20 }),
        isReady: creep => creep.pos.isNearTo((<Structure>Game.getObjectById(sourceId)).pos),
        source: creep => {
            const source: Source|Mineral = Game.getObjectById(sourceId)
            if (!source) return creep.say('目标找不到!')

            if (creep.harvest(source) == ERR_NOT_IN_RANGE) creep.moveTo(source, { reusePath: 20 })
        },
        target: creep => {
            const target: Structure = targetId ? Game.getObjectById(targetId) : creep.room.storage
            if (!target) return creep.say('目标找不到!')

            if (creep.transfer(target, Object.keys(creep.store)[0] as ResourceConstant) == ERR_NOT_IN_RANGE) creep.moveTo(target, { reusePath: 20 })
        },
        switch: creep => creep.updateState('🍚 收获'),
        spawn: spawnName,
        bodyType: 'worker'
    }),

    /**
     * 矿工
     * 从房间的 mineral 中获取资源 > 将资源转移到指定建筑中(默认为 terminal)
     * 
     * @param spawnName 出生点名称
     * @param targetId 指定建筑 id (默认为 room.terminal)
     */
    miner: (spawnName: string, targetId=''): ICreepConfig => ({
        // 检查矿床里是不是还有矿
        isNeed: room => {
            let mineral: Mineral
            if (!room.memory.mineralId) {
                // 没有返回警告，mineralId 由 ExtractorExtension 维护
                console.log(`[miner 警告] ${room.name} 请先建造 Extractor`)
                return false
            }
            else mineral = Game.getObjectById(room.memory.mineralId)
            // 房间中的矿床是否还有剩余产量
            return (mineral.mineralAmount > 0) ? true : false
        },
        source: creep => {
            const mineral: Mineral = Game.getObjectById(creep.room.memory.mineralId)
            if (!mineral) return creep.say('目标找不到!')
            // 采集/移动
            if (creep.harvest(mineral) == ERR_NOT_IN_RANGE) creep.moveTo(mineral, { reusePath: 20 })
        },
        target: creep => {
            const target: Structure = targetId ? Game.getObjectById(targetId) : creep.room.terminal
            if (!target) return creep.say('目标找不到!')
            // 转移/移动
            if (creep.transfer(target, Object.keys(creep.store)[0] as ResourceConstant) == ERR_NOT_IN_RANGE) creep.moveTo(target, { reusePath: 20 })
        },
        switch: creep => creep.updateState('🍚 收获'),
        spawn: spawnName,
        bodyType: 'worker'
    }),

    /**
     * 升级者
     * 只有在 sourceId 对应建筑中的能量大于指定数量时才会生成 @see setting.ts upgraderEnergyLimit
     * 从 Source 中采集能量一定会生成
     * 从指定结构中获取能量 > 将其转移到本房间的 Controller 中
     * 
     * @param sourceId 能量来源 id
     * @param spawnName 出生点名称
     */
    upgrader: (spawnName: string, sourceId: string): ICreepConfig => ({
        isNeed: room => {
            const source = Game.getObjectById(sourceId)
            if (!source) {
                console.log(`[生成挂起] ${room.name} upgrader 中的 ${sourceId} 不是一个有效的能量来源`)
                return false
            }

            // 能量快满了一定会生成
            if (source instanceof StructureStorage && source.store[RESOURCE_ENERGY] > 950000) return true

            // 八级时只有降级倒计时低于 100000 时才会生成
            if (room.controller.level == 8 && room.controller.ticksToDowngrade > 100000) return false

            // 只有在 storage 中能量大于 10000 时才会生成，其他建筑没有限制
            if (source instanceof StructureStorage && source.store[RESOURCE_ENERGY] > 10000) return true
            else return false
        },
        source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
        target: creep => creep.upgrade(),
        switch: creep => creep.updateState('📈 升级'),
        spawn: spawnName,
        bodyType: 'upgrader'
    }),

    /**
     * 建筑者
     * 只有在有工地时才会生成
     * 从指定结构中获取能量 > 查找建筑工地并建造
     * 
     * @param spawnName 出生点名称
     * @param sourceId 要挖的矿 id
     */
    builder: (spawnName: string, sourceId: string): ICreepConfig => ({
        isNeed: room => {
            const targets: ConstructionSite[] = room.find(FIND_MY_CONSTRUCTION_SITES)
            return targets.length > 0 ? true : false
        },
        source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
        target: creep => {
            if (creep.buildStructure()) { }
            else if (creep.upgrade()) { }
        },
        switch: creep => creep.updateState('🚧 建造'),
        spawn: spawnName,
        bodyType: 'worker'
    }),

    /**
     * 维修者
     * 从指定结构中获取能量 > 维修房间内的建筑
     * 
     * @param spawnName 出生点名称
     * @param sourceId 要挖的矿 id
     */
    repairer: (spawnName: string, sourceId: string): ICreepConfig => ({
        source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
        target: creep => {
            // 房间内没有 tower 负责维修建筑
            if (!creep.room._towerShoulderRepair) {
                // 去维修
                if (creep.repairStructure()) {}
                // 没得修就修墙
                else if (creep.fillDefenseStructure()) {}
            }
            else {
                // 房间内有 tower 负责维修就专心填塔
                creep.fillTower()
            }
        },
        switch: creep => creep.updateState('📌 修复'),
        spawn: spawnName,
        bodyType: 'smallWorker'
    }),

    /**
     * tower 填充者
     * 从指定结构中获取能量 > 将能量填充到 tower 中
     * 
     * @param spawnName 出生点名称
     * @param sourceId 要挖的矿 id
     */
    towerTransfer: (spawnName: string, sourceId: string): ICreepConfig => ({
        source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
        target: creep => {
            if (creep.fillTower()) {}
            // 没事干就去修墙
            else if (creep.fillDefenseStructure()) {}
        },
        switch: creep => creep.updateState('🍚 填塔'),
        spawn: spawnName,
        bodyType: 'smallWorker'
    })
}