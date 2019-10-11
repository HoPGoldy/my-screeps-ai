/**
 * 高级房间运营角色组
 * 本角色组包括了有 Storage 和 Link 的房间内运维所需的角色
 */
export default {
    /**
     * 运输者
     * 从 Storage 中获取能量，并填充 Spawn Extension 和 Tower
     * 
     * @param spawnName 出生点名称
     * @param bodys 身体部件 (可选)
     */
    transfer: (spawnName: string, bodys: BodyPartConstant[] = [ CARRY, CARRY, MOVE ]): ICreepConfig => ({
        source: creep => creep.getEngryFrom(creep.room.storage),
        target: creep => {
            // 获取有需求的建筑
            const target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                filter: s => (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_TOWER) && s.energy < s.energyCapacity
            })
            if (!target) return
            // 有的话就填充能量
            if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) creep.moveTo(target)
        },
        switch: creep => creep.carry.energy > 0,
        spawn: spawnName,
        bodys
    }),

    /**
     * 中心搬运者
     * 从 centerLink 中获取能量，并填充 Storage
     * 
     * @param x 要移动到的 x 坐标
     * @param y 要移动到的 y 坐标
     * @param centerLinkId 中央 link 的 id
     * @param spawnName 出生点名称
     * @param bodys 身体部件 (可选)
     */
    centerTransfer: (x: number, y: number, centerLinkId: string, spawnName: string, bodys: BodyPartConstant[] = [ CARRY, CARRY, MOVE ]): ICreepConfig => ({
        // 移动到指定位置
        prepare: creep => creep.moveTo(x, y),
        isReady: creep => creep.pos.x === x && creep.pos.y === y,
        // link 里有能量就拿出来
        source: creep => {
            const link: StructureLink = Game.getObjectById(centerLinkId)
            if (link.energy > 0) creep.withdraw(link, RESOURCE_ENERGY)
        },
        // 身上有能量就放到 Storage 里
        target: creep => creep.transfer(creep.room.storage, RESOURCE_ENERGY),
        switch: creep => creep.carry.energy > 0,
        spawn: spawnName,
        bodys
    }),

    /**
     * 静态采集者
     * 从 source 中获取能量，并转移到指定建筑
     * 注意！该角色一旦就位将不会再次移动，请保证指定建筑就在 Source 附件
     * 
     * @param sourceId 能量矿id
     * @param targetId 目标建筑id
     * @param spawnName 出生点名称
     * @param bodys 身体部件 (可选)
     */
    staticHarvester: (sourceId: string, targetId: string, spawnName: string, bodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]): ICreepConfig => ({
        // 移动到指定位置
        prepare: creep => creep.moveTo(Game.getObjectById(sourceId)),
        isReady: creep => creep.harvest(Game.getObjectById(sourceId)) === OK,
        // 一直采矿
        source: creep => creep.harvest(Game.getObjectById(sourceId)),
        // 采完了就放起来
        target: creep => creep.transfer(Game.getObjectById(targetId), RESOURCE_ENERGY),
        switch: creep => creep.updateState('🍚 收获'),
        spawn: spawnName,
        bodys
    }),

    /**
     * 静态升级者
     * 从指定结构中获取能量，并升级控制器
     * 注意！该角色一旦就位将不会再次移动，请保证指定建筑就在 controller 附件
     * 
     * @param sourceId 用来获取能量的建筑id
     * @param spawnName 出生点名称
     * @param bodys 身体部件 (可选)
     */
    staticUpgrader: (sourceId: string, spawnName: string, bodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]): ICreepConfig => ({
        // 移动到指定位置
        prepare: creep => creep.moveTo(Game.getObjectById(sourceId)),
        isReady: creep => creep.harvest(Game.getObjectById(sourceId)) === OK,
        // 拿出来能量
        source: creep => creep.withdraw(Game.getObjectById(sourceId), RESOURCE_ENERGY),
        // 拿完了就升级控制器
        target: creep => creep.upgradeController(creep.room.controller),
        switch: creep => creep.carry.energy > 0,
        spawn: spawnName,
        bodys
    }),
}