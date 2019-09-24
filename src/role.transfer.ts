const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]

/**
 * 运输者配置生成器
 * source: 从指定矿中挖矿
 * target: 将指定类型的资源转移到指定结构中
 * 
 * @param sourceId 要挖的矿 id
 * @param targetId 要运输到的建筑的 id
 * @param resourceType 要转移的资源类型
 * @param spawnName 出生点名称
 * @param bodys 身体部件 (可选)
 */
export default function (sourceId: string, targetId: string, resourceType: ResourceConstructor, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig {
    const config: ICreepConfig = {
        source: [{
            func: 'getEngryFrom',
            args: [ Game.getObjectById(sourceId), 'harvest' ]
        }],
        target: [{
            func: 'transferTo',
            args: [ Game.getObjectById(targetId), resourceType ]
        }],
        switch: {
            func: 'updateState',
            args: [ '🚒 运输' ]
        },
        spawn: spawnName,
        bodys
    }

    return config
}