const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE, WORK, CARRY, MOVE ]

/**
 * 采矿者配置生成器
 * 从指定矿中挖矿 > 将矿转移到 spawn 和 extension 中
 * 
 * @param sourceId 要挖的矿 id
 * @param spawnName 出生点名称
 * @param bodys 身体部件 (可选)
 */
export default (sourceId: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys, backupStorageId: string=''): ICreepConfig => ({
    source: creep => creep.getEngryFrom(Game.getObjectById(sourceId), 'harvest'),
    target: creep => creep.fillSpawnEngry(backupStorageId),
    switch: creep => creep.updateState('🍚 收获'),
    spawn: spawnName,
    bodys
})