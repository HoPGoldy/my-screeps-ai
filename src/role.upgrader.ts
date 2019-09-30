const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE, WORK, CARRY, MOVE ]

/**
 * 升级者配置生成器
 * source: 从指定矿中挖矿
 * target: 将其转移到指定的 roomController 中
 * 
 * @param sourceId 要挖的矿 id
 * @param spawnName 出生点名称
 * @param bodys 身体部件 (可选)
 */
export default function (sourceId: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig {
    const config: ICreepConfig = {
        source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
        target: creep => creep.upgrade(),
        switch: creep => creep.updateState('📈 升级'),
        spawn: spawnName,
        bodys
    }

    return config
}