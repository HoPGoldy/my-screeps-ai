const defaultBodys: BodyPartConstant[] = [ CLAIM, MOVE ]

/**
 * 占领者配置生成器
 * source: 无
 * target: 占领指定房间
 * 
 * @param targetRoomName 要占领的房间名
 * @param spawnName 出生点名称
 * @param bodys 身体部件 (可选)
 */
export default function (targetRoomName: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig {
    const config: ICreepConfig = {
        source: [ ],
        target: [{
            func: 'claim',
            args: [ targetRoomName ]
        }],
        spawn: spawnName,
        bodys
    }

    return config
}