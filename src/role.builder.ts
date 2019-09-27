const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE, WORK ]

/**
 * 建筑者配置生成器
 * source: 从指定矿中挖矿
 * target: 查找建筑工地并建造
 * 
 * @param sourceId 要挖的矿 id
 * @param spawnName 出生点名称
 * @param bodys 身体部件 (可选)
 */
export default (sourceId: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig => ({
    source: creep => creep.getEngryFrom(Game.getObjectById(sourceId), 'harvest'),
    target: creep => {
        if (creep.buildStructure()) { }
        else if (creep.upgrade()) { }
    },
    switch: creep => creep.updateState('🚧 建造'),
    spawn: spawnName,
    bodys
})