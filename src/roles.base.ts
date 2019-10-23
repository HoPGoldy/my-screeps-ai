/**
 * 初级房间运维角色组
 * 本角色组包括了在没有 Storage 和 Link 的房间内运维所需的角色
 */
export default {
    /**
     * 采集者
     * 从指定 source 中获取能量 > 将矿转移到 spawn 和 extension 中
     * 
     * @param sourceId 要挖的矿 id
     * @param spawnName 出生点名称
     * @param backupStorageId 填满后将能量转移到的建筑 (可选)
     */
    harvester: (sourceId: string, spawnName: string, backupStorageId: string=''): ICreepConfig => ({
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
     * @param sourceId 要挖的矿 id
     * @param targetId 指定建筑 id
     * @param spawnName 出生点名称
     */
    collector: (sourceId: string, targetId: string, spawnName: string): ICreepConfig => ({
        prepare: creep => creep.moveTo(Game.getObjectById(sourceId)),
        isReady: creep => creep.pos.isNearTo((<Structure>Game.getObjectById(sourceId)).pos),
        source: creep => {
            const source: Source|Mineral = Game.getObjectById(sourceId)
            if (creep.harvest(source) == ERR_NOT_IN_RANGE) creep.moveTo(source)
        },
        target: creep => {
            const target: Structure = Game.getObjectById(targetId)
            if (creep.transfer(target, Object.keys(creep.store)[0] as ResourceConstant) == ERR_NOT_IN_RANGE) creep.moveTo(target)
        },
        switch: creep => creep.updateState('🍚 收获'),
        spawn: spawnName,
        bodyType: 'worker'
    }),

    /**
     * 资源转移者
     * 从指定建筑中获取资源 > 将资源转移到指定建筑中
     * 
     * @param sourceId 获取资源的建筑 id
     * @param targetId 指定建筑 id
     * @param spawnName 出生点名称
     */
    resourceTransfer: (sourceId: string, ResourceType: ResourceConstant, targetId: string, spawnName: string): ICreepConfig => ({
        source: creep => {
            const source: Structure = Game.getObjectById(sourceId)
            if (creep.withdraw(source, ResourceType) == ERR_NOT_IN_RANGE) creep.moveTo(source)
        },
        target: creep => {
            const target: Structure = Game.getObjectById(targetId)
            if (creep.transfer(target, Object.keys(creep.carry)[0] as ResourceConstant) == ERR_NOT_IN_RANGE) creep.moveTo(target)
        },
        switch: creep => creep.updateState('🍚 收获'),
        spawn: spawnName,
        bodyType: 'transfer'
    }),

    /**
     * 升级者
     * 从指定结构中获取能量 > 将其转移到本房间的 Controller 中
     * 
     * @param sourceId 要挖的矿 id
     * @param spawnName 出生点名称
     */
    upgrader: (sourceId: string, spawnName: string): ICreepConfig => ({
        source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
        target: creep => creep.upgrade(),
        switch: creep => creep.updateState('📈 升级'),
        spawn: spawnName,
        bodyType: 'worker'
    }),

    /**
     * 建筑者
     * 从指定结构中获取能量 > 查找建筑工地并建造
     * 
     * @param sourceId 要挖的矿 id
     * @param spawnName 出生点名称
     */
    builder: (sourceId: string, spawnName: string): ICreepConfig => ({
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
     * @param sourceId 要挖的矿 id
     * @param spawnName 出生点名称
     */
    repairer: (sourceId: string, spawnName: string): ICreepConfig => ({
        source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
        target: creep => {
            // 去维修
            if (creep.repairStructure()) {}
            // 没得修就修墙
            else if (creep.fillDefenseStructure()) {}
        },
        switch: creep => creep.updateState('📌 修复'),
        spawn: spawnName,
        bodyType: 'repairer'
    }),

    /**
     * tower 填充者
     * 从指定结构中获取能量 > 将能量填充到 tower 中
     * 
     * @param sourceId 要挖的矿 id
     * @param spawnName 出生点名称
     */
    towerTransfer: (sourceId: string, spawnName: string): ICreepConfig => ({
        source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
        target: creep => {
            if (creep.fillTower()) {}
            // 没事干就去修墙
            else if (creep.fillDefenseStructure()) {}
        },
        switch: creep => creep.updateState('🍚 填塔'),
        spawn: spawnName,
        bodyType: 'worker'
    }),

    /**
     * 测试用 creep
     * 啥都不干
     * 
     * @param spawnName 出生点名称
     */
    tester: (sourceId: string, targetId: string, spawnName: string): ICreepConfig => ({
        prepare: creep => creep.moveTo(Game.getObjectById(sourceId)),
        isReady: creep => creep.pos.isNearTo((<Structure>Game.getObjectById(sourceId)).pos),
        source: creep => {
            const source: Source|Mineral = Game.getObjectById(sourceId)
            if (creep.harvest(source) == ERR_NOT_IN_RANGE) creep.moveTo(source)
        },
        target: creep => {
            const target: Structure = Game.getObjectById(targetId)
            if (creep.transfer(target, Object.keys(creep.store)[0] as ResourceConstant) == ERR_NOT_IN_RANGE) creep.moveTo(target)
        },
        switch: creep => creep.updateState('🍚 收获'),
        spawn: spawnName,
        bodyType: 'worker'
    })
}