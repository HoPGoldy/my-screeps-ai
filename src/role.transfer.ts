const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]

/**
 * 运输者配置生成器
 * source: 从指定矿中挖矿
 * target: 将指定类型的资源转移到指定结构中
 * 
 * @param sourceId 要挖的矿 id
 * @param targetId 要运输到的建筑的 id
 * @param resourceType 要转移的资源类型
 * @param spawnName 出生点名称
 * @param bodys 身体部件 (可选)
 */
export default (sourceId: string, targetId: string, resourceType: ResourceConstant, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig => ({
    source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
    target: creep => creep.transferTo(Game.getObjectById(targetId), resourceType),
    switch: creep => creep.updateState('🚒 运输'),
    spawn: spawnName,
    bodys
})