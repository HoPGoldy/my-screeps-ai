const defaultBodys: BodyPartConstant[] = [ MOVE ]

/**
 * 签名者配置生成器
 * 会先抵达指定房间, 然后执行签名
 * 
 * @param targetRoomName 要签名的目标房间名
 * @param signText 要签名的内容
 * @param spawnName 出生点
 * @param bodys 身体部件(可选)
 */
export default (targetRoomName: string, signText: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig => ({
    source: creep => creep.farMoveTo(new RoomPosition(25, 25, targetRoomName)),
    target: creep => {
        if (creep.signController(creep.room.controller, signText) === ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller, { reusePath: 30 })
        }
    },
    switch: creep => creep.room.name === targetRoomName,
    spawn: spawnName,
    bodys
})