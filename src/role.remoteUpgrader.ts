const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]

/**
 * 支援 - 采矿者配置生成器
 * 拓展型建造者, 会先抵达指定房间, 然后执行建造者逻辑
 * 
 * @param targetRoomName 要支援的目标房间名
 * @param sourceId 要采集的矿物 id
 * @param spawnName 出生点
 * @param bodys 身体部件(可选)
 */
export default (targetRoomName: string, sourceId: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig => ({
    // 向指定房间移动
    prepare: creep => creep.farMoveTo(new RoomPosition(25, 25, targetRoomName)),
    // 自己所在的房间为指定房间则准备完成
    isReady: creep => creep.room.name === targetRoomName,
    // 下面是正常的升级者逻辑
    source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
    target: creep => creep.upgrade(),
    switch: creep => creep.updateState('📈 支援升级'),
    spawn: spawnName,
    bodys
})