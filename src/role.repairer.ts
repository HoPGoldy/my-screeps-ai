const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]

/**
 * 维修者配置生成器
 * source: 从指定矿中挖矿
 * target: 维修房间内的建筑
 * 
 * @param sourceId 要挖的矿 id
 * @param spawnName 出生点名称
 * @param bodys 身体部件 (可选)
 */
export default (sourceId: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig => ({
    source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
    target: creep => {
        // 去维修
        if (creep.repairStructure()) { }
        // 没得修就填塔
        else if (creep.fillTower()) { }
    },
    switch: creep => creep.updateState('📌 修复'),
    spawn: spawnName,
    bodys
})