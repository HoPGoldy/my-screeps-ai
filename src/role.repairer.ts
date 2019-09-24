const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]

/**
 * 维修者配置生成器
 * source: 从指定矿中挖矿
 * target: 维修房间内的建筑
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
            func: 'repairStructure',
            args: [ ]
        }],
        switch: {
            func: 'updateState',
            args: [ '📌 修复' ]
        },
        spawn: spawnName,
        bodys
    }

    return config
}