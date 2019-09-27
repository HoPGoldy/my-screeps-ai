const defaultBodys: BodyPartConstant[] = [ MOVE ]

/**
 * 签名者配置生成器
 * 会先抵达指定房间, 然后执行签名逻辑
 * 
 * @param targetRoomName 要签名的目标房间名
 * @param spawnName 出生点
 * @param bodys 身体部件(可选)
 */
export default (targetRoomName: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig => ({
    target: creep => creep.sign('Praise the sun!'),
    switch: creep => creep.moveToRoom(targetRoomName),
    spawn: spawnName,
    bodys
})