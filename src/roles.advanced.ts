/**
 * 高级房间运营角色组
 * 本角色组包括了有 Storage 和 Link 的房间内运维所需的角色
 */
export default {
    /**
     * 运输者配置生成器
     * 从 Storage 中获取能量，并填充 Spawn Extension 和 Tower
     * 
     * @param storageId Storage的id
     * @param spawnName 出生点名称
     * @param bodys 身体部件 (可选)
     */
    transfer: (storageId: string, spawnName: string, bodys: BodyPartConstant[] = [ CARRY, CARRY, MOVE ]): ICreepConfig => ({
        source: creep => creep.getEngryFrom(Game.getObjectById(storageId)),
        target: creep => {
            // 获取有需求的建筑
            const target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                filter: s => (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_TOWER) && s.energy < s.energyCapacity
            })
            if (!target) return
            // 有的话就填充能量
            if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) creep.moveTo(target)
        },
        switch: creep => creep.updateState('🍖 填充'),
        spawn: spawnName,
        bodys
    }),
}