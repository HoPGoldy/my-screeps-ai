const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE, WORK ]

/**
 * 建筑者配置生成器
 * source: 从指定矿中挖矿
 * target: 查找建筑工地并建造
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
            func: 'buildStructure',
            args: [ ]
        }],
        switch: {
            func: 'updateState',
            args: [ '🚧 建造' ]
        },
        spawn: spawnName,
        bodys
    }

    return config
}