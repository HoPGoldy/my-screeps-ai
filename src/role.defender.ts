const defaultBodys: BodyPartConstant[] = [ ATTACK, MOVE, MOVE ]

/**
 * 防御者配置生成器
 * source: 到 "房间名 StandBy" 旗帜下待命
 * target: 攻击出现的敌人
 * 
 * @param spawnName 出生点名称
 * @param bodys 身体部件 (可选)
 */
export default (spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig => ({
    source: creep => creep.standBy(),
    target: creep => creep.defense(),
    switch: creep => creep.checkEnemy(),
    spawn: spawnName,
    bodys
})