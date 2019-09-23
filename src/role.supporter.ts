const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]

/**
 * 支援者配置生成器
 * 拓展型建造者, 会先抵达指定房间, 然后执行建造者逻辑
 * 
 * @param targetRoomName 要支援的目标房间名
 * @param sourceId 要采集的矿物 id
 * @param spawnName 出生点
 * @param bodys 身体部件(可选)
 */
export default function (targetRoomName: string, sourceId: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig {
    const config: ICreepConfig = {
        source: [{
            // 先移动到指定房间
            func: 'supportTo',
            args: [ targetRoomName ]
        },{
            // 再挖矿
            func: 'getEngryFrom',
            args: [ Game.getObjectById(sourceId), 'harvest' ]
        }],
        target: [{
            // 先移动到指定房间
            func: 'supportTo',
            args: [ targetRoomName ]
        }, {
            // 再挖矿
            func: 'buildStructure',
            args: [ ]
        }],
        switch: {
            func: 'updateState',
            args: [ ]
        },
        spawn: spawnName,
        bodys
    }

    return config
}