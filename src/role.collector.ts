const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]

/**
 * 收集者配置生成器
 * 从指定矿中挖矿 > 维修当前房间内的结构，然后将矿转移到指定建筑中
 * 注意！矿和建筑的视野都必须拥有
 * 
 * @param sourceId 要挖的矿 id
 * @param spawnName 出生点名称
 * @param bodys 身体部件 (可选)
 */
export default (sourceId: string, storageId: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig => ({
    source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
    target: creep => {
        // 修路
        if (creep.repairStructure()) creep.say('先修个路')
        // 都修好了就送能量回家
        else if (creep.transferTo(Game.getObjectById(storageId), RESOURCE_ENERGY)) { }
    },
    switch: creep => creep.updateState('🍚 收获'),
    spawn: spawnName,
    bodys
})