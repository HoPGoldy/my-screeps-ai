/**
 * 初级房间运维角色组
 * 本角色组包括了在没有 Storage 和 Link 的房间内运维所需的角色
 */
export default {
    /**
     * 采矿者配置生成器
     * 从指定结构中获取能量 > 将矿转移到 spawn 和 extension 中
     * 
     * @param sourceId 要挖的矿 id
     * @param spawnName 出生点名称
     * @param bodys 身体部件 (可选)
     */
    harvester: (sourceId: string, spawnName: string, bodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ], backupStorageId: string=''): ICreepConfig => ({
        source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
        target: creep => creep.fillSpawnEngry(backupStorageId),
        switch: creep => creep.updateState('🍚 收获'),
        spawn: spawnName,
        bodys
    }),

    /**
     * 升级者配置生成器
     * 从指定结构中获取能量 > 将其转移到本房间的 Controller 中
     * 
     * @param sourceId 要挖的矿 id
     * @param spawnName 出生点名称
     * @param bodys 身体部件 (可选)
     */
    upgrader: (sourceId: string, spawnName: string, bodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]): ICreepConfig => ({
        source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
        target: creep => creep.upgrade(),
        switch: creep => creep.updateState('📈 升级'),
        spawn: spawnName,
        bodys
    }),

    /**
     * 建筑者配置生成器
     * 从指定结构中获取能量 > 查找建筑工地并建造
     * 
     * @param sourceId 要挖的矿 id
     * @param spawnName 出生点名称
     * @param bodys 身体部件 (可选)
     */
    builder: (sourceId: string, spawnName: string, bodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]): ICreepConfig => ({
        source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
        target: creep => {
            if (creep.buildStructure()) { }
            else if (creep.upgrade()) { }
        },
        switch: creep => creep.updateState('🚧 建造'),
        spawn: spawnName,
        bodys
    }),

    /**
     * 维修者配置生成器
     * 从指定结构中获取能量 > 维修房间内的建筑
     * 
     * @param sourceId 要挖的矿 id
     * @param spawnName 出生点名称
     * @param bodys 身体部件 (可选)
     */
    repairer: (sourceId: string, spawnName: string, bodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]): ICreepConfig => ({
        source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
        target: creep => {
            // 去维修
            if (creep.repairStructure()) {}
            // 没得修就修墙
            else if (creep.fillDefenseStructure()) {}
        },
        switch: creep => creep.updateState('📌 修复'),
        spawn: spawnName,
        bodys
    }),

    /**
     * tower 填充者配置生成器
     * 从指定结构中获取能量 > 将能量填充到 tower 中
     * 
     * @param sourceId 要挖的矿 id
     * @param spawnName 出生点名称
     * @param bodys 身体部件 (可选)
     */
    towerTransfer: (sourceId: string, spawnName: string, bodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]): ICreepConfig => ({
        source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
        target: creep => {
            if (creep.fillTower()) {}
            // 没事干就去修墙
            else if (creep.fillDefenseStructure()) {}
        },
        switch: creep => creep.updateState('🍚 填塔'),
        spawn: spawnName,
        bodys
    })
}