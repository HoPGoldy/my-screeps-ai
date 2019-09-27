const defaultBodys: BodyPartConstant[] = [ HEAL, MOVE, MOVE ]

/**
 * 医生配置生成器
 * source: 无
 * target: 治疗给定的 creep
 * 
 * @param spawnName 出生点名称
 * @param creepsName 要治疗的 creep 名称数组
 * @param bodys 身体部件 (可选)
 */
export default (spawnName: string, creepsName: string[], bodys: BodyPartConstant[] = defaultBodys): ICreepConfig => ({
    target: creep => creep.healTo(creepsName.map(name => Game.creeps[name])),
    spawn: spawnName,
    bodys
})