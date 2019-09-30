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
export default (targetRoomName: string, sourceId: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig => ({
    source: creep => {
        if (creep.moveToRoom(targetRoomName)) creep.getEngryFrom(Game.getObjectById(sourceId))
    },
    target: creep => {
        if (creep.moveToRoom(targetRoomName)) {
            if (creep.buildStructure()) { }
            else if (creep.upgrade()) { }
        }
    },
    switch: creep => creep.updateState('🚧 支援'),
    spawn: spawnName,
    bodys
})