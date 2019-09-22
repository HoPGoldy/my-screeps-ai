/**
 * 建筑者逻辑
 * 
 * source: 从指定矿中挖矿
 * target: 查找建筑工地并建造
 */

const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]

export default function (sourceId: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig {
    const config: ICreepConfig = {
        source: {
            func: 'getObjectById',
            args: [ sourceId ]
        },
        target: {
            func: 'buildStructure',
            args: [ ]
        },
        spawn: spawnName,
        bodys
    }

    return config
}