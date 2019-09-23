const defaultBodys: BodyPartConstant[] = [ ATTACK, MOVE, MOVE ]

/**
 * 防御者配置生成器
 * source: 到 "房间名 StandBy" 旗帜下待命
 * target: 攻击出现的敌人
 * 
 * @param spawnName 出生点名称
 * @param bodys 身体部件 (可选)
 */
export default function (spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig {
    const config: ICreepConfig = {
        source: [{
            func: 'standBy',
            args: [ ]
        }],
        target: [{
            func: 'defense',
            args: [ ]
        }],
        switch: {
            func: 'checkEnemy',
            args: [ ]
        },
        spawn: spawnName,
        bodys
    }

    return config
}