const defaultBodys: BodyPartConstant[] = [ CLAIM, CLAIM, MOVE ]

/**
 * 预定者配置生成器
 * 准备阶段：向指定房间控制器移动
 * 阶段A：预定控制器
 * 
 * @param sourceInfo 要预定的控制器的信息
 * @param spawnName 出生点名称
 * @param bodys 身体部件 (可选)
 */
export default (sourceInfo: IPositionInfo, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig => ({
    // 朝控制器移动
    prepare: creep => creep.farMoveTo(new RoomPosition(sourceInfo.x, sourceInfo.y, sourceInfo.roomName)),
    // 只要可以摸到控制器就说明准备阶段完成
    isReady: creep => creep.reserveController(Game.getObjectById(sourceInfo.id)) === OK,
    // 一直进行预定
    target: creep => creep.reserveController(Game.getObjectById(sourceInfo.id)),
    spawn: spawnName,
    bodys
})