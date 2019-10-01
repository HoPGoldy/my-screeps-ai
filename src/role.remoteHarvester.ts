const defaultBodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ] // WORK, CARRY, 

interface ISourceInfo {
    id: string
    roomName: string
    x: number
    y: number
}

/**
 * 采矿者配置生成器
 * 从指定矿中挖矿 > 将矿转移到建筑中
 * 
 * @param sourceId 要挖的矿 id
 * @param spawnName 出生点名称
 * @param bodys 身体部件 (可选)
 */
export default (sourceInfo: ISourceInfo, targetId: string, spawnName: string, bodys: BodyPartConstant[] = defaultBodys): ICreepConfig => ({
    // 准备阶段：将到指定矿的路径写入缓存
    prepare: creep => {
        if (!creep.spawning) {
            creep.say('准备了！')
            creep.findPathTo(new RoomPosition(sourceInfo.x, sourceInfo.y, sourceInfo.roomName))
        }
    },
    // 缓存中路径不为空就说明准备好了
    isReady: creep => creep.memory.path.length > 0,
    source: creep => {
        console.log(creep.moveByPath(creep.memory.path))
        // if (creep.harvest(Game.getObjectById(sourceInfo.id)) !== 0) {
            
        // }
    },
    target: creep => {
        if (creep.transfer(Game.getObjectById(targetId), RESOURCE_ENERGY) !== 0) {
            creep.moveByPath(creep.memory.path)
        }
    },
    switch: creep => creep.updateState('🍚 收获', (c: Creep, state: boolean) => {
        // 看是要回还是要去
        const endPos: RoomPosition = state ? new RoomPosition(sourceInfo.x, sourceInfo.y, sourceInfo.roomName) : Game.getObjectById<Structure>(targetId).pos
        // 计算路径
        if (!c.findPathTo(endPos)) console.log(`找不到到 ${endPos.roomName} ${endPos.x} ${endPos.y} 的路径！`)
    }),
    spawn: spawnName,
    bodys
})