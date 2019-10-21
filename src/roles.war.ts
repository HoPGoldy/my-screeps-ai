/**
 * 战斗角色组
 * 本角色组包括了对外战斗和房间防御所需要的角色
 */
export default {
    /**
     * 士兵
     * 会一直向旗帜发起进攻,
     * 优先攻击旗帜 3*3 范围内的 creep, 没有的话会攻击旗帜所在位置的建筑
     * 
     * @param spawnName 出生点名称
     * @param bodys 身体部件 (可选)
     */
    soldier: (spawnName: string, bodys: BodyPartConstant[] = [ ATTACK, MOVE, MOVE ]): ICreepConfig => ({
        target: creep => creep.attackFlag(),
        spawn: spawnName,
        bodyType: 'attacker'
    }),

    /**
     * 医生
     * 一直治疗给定的 creep
     * 
     * @param spawnName 出生点名称
     * @param creepsName 要治疗的 creep 名称数组
     * @param bodys 身体部件 (可选)
     */
    doctor: (spawnName: string, creepsName: string[], bodys: BodyPartConstant[] = [ HEAL, MOVE, MOVE ]): ICreepConfig => ({
        target: creep => creep.healTo(creepsName.map(name => Game.creeps[name])),
        spawn: spawnName,
        bodyType: 'healer'
    }),

    /**
     * 房间防御者
     * 到 "房间名 StandBy" 旗帜下待命 > 攻击出现的敌人
     * 
     * @param spawnName 出生点名称
     * @param bodys 身体部件 (可选)
     */
    defender: (spawnName: string, bodys: BodyPartConstant[] = [ ATTACK, MOVE, MOVE ]): ICreepConfig => ({
        source: creep => creep.standBy(),
        target: creep => creep.defense(),
        switch: creep => creep.checkEnemy(),
        spawn: spawnName,
        bodyType: 'attacker'
    })
}