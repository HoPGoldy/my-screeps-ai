/**
 * 维修者逻辑
 * 
 * source: 从指定矿中挖矿
 * target: 维修房间内的建筑
 */

const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]

export default function (sourceId: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig {
    const config: ICreepConfig = {
        source: {
            func: 'getObjectById',
            args: [ sourceId ]
        },
        target: {
            func: 'repairStructure',
            args: [ ]
        },
        spawn: spawnName,
        bodys
    }

    return config
}