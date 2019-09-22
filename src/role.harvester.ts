/**
 * 采矿者逻辑
 * 
 * source: 从指定矿中挖矿
 * target: 将其转移到 spawn 和 extension 中
 */

const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]

export default function (sourceId: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig {
    const config: ICreepConfig = {
        source: {
            func: 'getEngryFrom',
            args: [ Game.getObjectById(sourceId), 'harvest' ]
        },
        target: {
            func: 'fillSpawnEngry',
            args: [ ]
        },
        spawn: spawnName,
        bodys
    }

    return config
}