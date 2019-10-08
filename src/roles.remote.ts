/**
 * 多房间角色组
 * 本角色组包括了多房间拓展所需要的角色
 */
export default {
    /**
     * 占领者配置生成器
     * source: 无
     * target: 占领指定房间
     * 
     * @param spawnName 出生点名称
     * @param bodys 身体部件 (可选)
     */ 
    claimer: (spawnName: string, bodys: BodyPartConstant[] = [ CLAIM, MOVE ]): ICreepConfig => ({
        target: creep => creep.claim(),
        spawn: spawnName,
        bodys
    }),

    /**
     * 签名者配置生成器
     * 会先抵达指定房间, 然后执行签名
     * 
     * @param targetRoomName 要签名的目标房间名
     * @param signText 要签名的内容
     * @param spawnName 出生点
     * @param bodys 身体部件(可选)
     */
    signer: (targetRoomName: string, signText: string, spawnName: string, bodys: BodyPartConstant[] = [ MOVE ]): ICreepConfig => ({
        source: creep => creep.farMoveTo(new RoomPosition(25, 25, targetRoomName)),
        target: creep => {
            if (creep.signController(creep.room.controller, signText) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, { reusePath: 30 })
            }
        },
        switch: creep => creep.room.name === targetRoomName,
        spawn: spawnName,
        bodys
    }),

    /**
     * 支援者配置生成器
     * 拓展型建造者, 会先抵达指定房间, 然后执行建造者逻辑
     * 
     * @param targetRoomName 要支援的目标房间名
     * @param sourceId 要采集的矿物 id
     * @param spawnName 出生点
     * @param bodys 身体部件(可选)
     */
    remoteBuilder: (targetRoomName: string, sourceId: string, spawnName: string, bodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]): ICreepConfig => ({
        // 向指定房间移动
        prepare: creep => creep.farMoveTo(new RoomPosition(25, 25, targetRoomName)),
        // 自己所在的房间为指定房间则准备完成
        isReady: creep => creep.room.name === targetRoomName,
        // 下面是正常的建造者逻辑
        source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
        target: creep => {
            if (creep.buildStructure()) { }
            else if (creep.upgrade()) { }
        },
        switch: creep => creep.updateState('🚧 支援建造'),
        spawn: spawnName,
        bodys
    }),

    /**
     * 支援 - 采矿者配置生成器
     * 拓展型建造者, 会先抵达指定房间, 然后执行建造者逻辑
     * 
     * @param targetRoomName 要支援的目标房间名
     * @param sourceId 要采集的矿物 id
     * @param spawnName 出生点
     * @param bodys 身体部件(可选)
     */
    remoteUpgrader: (targetRoomName: string, sourceId: string, spawnName: string, bodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]): ICreepConfig => ({
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
    }),

    /**
     * 外矿采矿者配置生成器
     * 从指定矿中挖矿 > 将矿转移到建筑中
     * 
     * @param sourceInfo 外矿的信息
     * @param targetId 要移动到的建筑 id
     * @param spawnName 出生点名称
     * @param bodys 身体部件 (可选)
     */
    remoteHarvester: (sourceInfo: IPositionInfo, targetId: string, spawnName: string, bodys: BodyPartConstant[] = [ WORK, CARRY, MOVE ]): ICreepConfig => ({
        source: creep => {
            // 这里的移动判断条件是 !== OK, 因为外矿有可能没视野, 下同
            if (creep.harvest(Game.getObjectById(sourceInfo.id)) !== OK) {
                creep.farMoveTo(new RoomPosition(sourceInfo.x, sourceInfo.y, sourceInfo.roomName))
            }
        },
        target: creep => {
            // 检查脚下的路有没有问题，有的话就进行维修
            const structures = creep.pos.lookFor(LOOK_STRUCTURES)
            if (structures.length > 0) {
                const road = structures[0]
                if (road.hits < road.hitsMax) creep.repair(road)
            }
            // 没有的话就放工地并建造
            else {
                const constructionSites = creep.pos.lookFor(LOOK_CONSTRUCTION_SITES)
                if (constructionSites.length > 0) {
                    const site = constructionSites[0]
                    creep.build(site)
                }
                else {
                    creep.pos.createConstructionSite(STRUCTURE_ROAD)
                }
            }
            // 在把剩余能量运回去
            if (creep.transfer(Game.getObjectById(targetId), RESOURCE_ENERGY) !== OK) {
                creep.farMoveTo(Game.getObjectById(targetId))
            }
        },
        // 状态刷新时移除内存中的路径缓存
        switch: creep => creep.updateState('🍚 收获', (c: Creep) => delete c.memory.path),
        spawn: spawnName,
        bodys
    })
}