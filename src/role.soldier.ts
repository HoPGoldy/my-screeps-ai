const defaultBodys: BodyPartConstant[] = [ ATTACK, MOVE, MOVE ]

/**
 * 士兵配置生成器
 * source: 无
 * target: 向旗帜发起进攻
 * 
 * @param spawnName 出生点名称
 * @param bodys 身体部件 (可选)
 */
export default (spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig => ({
    target: creep => creep.attackFlag(),
    spawn: spawnName,
    bodys
})