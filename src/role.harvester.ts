const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE, WORK, CARRY, MOVE ]

/**
 * 采矿者配置生成器
 * source: 从指定矿中挖矿
 * target: 将其转移到 spawn 和 extension 中
 * 
 * @param sourceId 要挖的矿 id
 * @param spawnName 出生点名称
 * @param bodys 身体部件 (可选)
 */
export default function (sourceId: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig {
    const config: ICreepConfig = {
        source: [{
            func: 'getEngryFrom',
            args: [ Game.getObjectById(sourceId), 'harvest' ]
        }],
        target: [{
            func: 'fillSpawnEngry',
            args: [ ]
        }],
        switch: {
            func: 'updateState',
            args: [ '🍚 收获' ]
        },
        spawn: spawnName,
        bodys
    }

    return config
}