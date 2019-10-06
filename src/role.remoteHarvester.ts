const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ] // WORK, CARRY, 

/**
 * 外矿采矿者配置生成器
 * 从指定矿中挖矿 > 将矿转移到建筑中
 * 
 * @param sourceInfo 外矿的信息
 * @param targetId 要移动到的建筑 id
 * @param spawnName 出生点名称
 * @param bodys 身体部件 (可选)
 */
export default (sourceInfo: IPositionInfo, targetId: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig => ({
    source: creep => {
        // 这里的移动判断条件是 !== OK, 因为外矿有可能没视野, 下同
        if (creep.harvest(Game.getObjectById(sourceInfo.id)) !== OK) {
            creep.farMoveTo(new RoomPosition(sourceInfo.x, sourceInfo.y, sourceInfo.roomName))
        }
    },
    target: creep => {
        if (creep.transfer(Game.getObjectById(targetId), RESOURCE_ENERGY) !== OK) {
            creep.farMoveTo(Game.getObjectById(targetId))
        }
    },
    // 状态刷新时移除内存中的路径缓存
    switch: creep => creep.updateState('🍚 收获', c => delete c.memory.path),
    spawn: spawnName,
    bodys
})