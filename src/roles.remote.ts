/**
 * 多房间角色组
 * 本角色组包括了多房间拓展所需要的角色
 */
export default {
    /**
     * 占领者
     * source: 无
     * target: 占领指定房间
     * 
     * @param spawnName 出生点名称
     */ 
    claimer: (spawnName: string): ICreepConfig => ({
        target: creep => creep.claim(),
        spawn: spawnName,
        bodyType: 'claimer'
    }),

    /**
     * 预定者
     * 准备阶段：向指定房间控制器移动
     * 阶段A：预定控制器
     * 
     * @param spawnName 出生点名称
     * @param sourceInfo 要预定的控制器的信息
     */
    reserver: (spawnName: string, sourceInfo: IPositionInfo): ICreepConfig => ({
        // 朝控制器移动
        prepare: creep => creep.farMoveTo(new RoomPosition(sourceInfo.x, sourceInfo.y, sourceInfo.roomName)),
        // 只要可以摸到控制器就说明准备阶段完成
        isReady: creep => creep.reserveController(creep.room.controller) === OK,
        // 一直进行预定
        target: creep => {
            // 检查自己身边有没有敌人
            const enemys = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 2)
            // 有的话就往家跑
            if (enemys.length > 0) {
                creep.farMoveTo(Game.spawns[spawnName].pos)
            }
            
            // 房间被预定且预定时间没有超过上限
            if (creep.room.controller.reservation && creep.room.controller.reservation.ticksToEnd < CONTROLLER_RESERVE_MAX) {
                creep.reserveController(creep.room.controller)
            }
        },
        spawn: spawnName,
        bodyType: 'claimer'
    }),

    /**
     * 签名者
     * 会先抵达指定房间, 然后执行签名
     * 
     * @param spawnName 出生点名称
     * @param targetRoomName 要签名的目标房间名
     * @param signText 要签名的内容
     */
    signer: (spawnName: string, targetRoomName: string, signText: string): ICreepConfig => ({
        source: creep => creep.farMoveTo(new RoomPosition(25, 25, targetRoomName)),
        target: creep => {
            if (creep.signController(creep.room.controller, signText) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, { reusePath: 30 })
            }
        },
        switch: creep => creep.room.name === targetRoomName,
        spawn: spawnName,
        bodyType: 'worker'
    }),

    /**
     * 支援者
     * 拓展型建造者, 会先抵达指定房间, 然后执行建造者逻辑
     *
     * @param spawnName 出生点名称
     * @param targetRoomName 要支援的目标房间名
     * @param sourceId 要采集的矿物 id
     */
    remoteBuilder: (spawnName: string, targetRoomName: string, sourceId: string): ICreepConfig => ({
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
        bodyType: 'worker'
    }),

    /**
     * 支援 - 采矿者
     * 拓展型建造者, 会先抵达指定房间, 然后执行建造者逻辑
     * 
     * @param spawnName 出生点名称
     * @param targetRoomName 要支援的目标房间名
     * @param sourceId 要采集的矿物 id
     */
    remoteUpgrader: (spawnName: string, targetRoomName: string, sourceId: string): ICreepConfig => ({
        // 向指定房间移动
        prepare: creep => creep.farMoveTo(new RoomPosition(25, 25, targetRoomName)),
        // 自己所在的房间为指定房间则准备完成
        isReady: creep => creep.room.name === targetRoomName,
        // 下面是正常的升级者逻辑
        source: creep => creep.getEngryFrom(Game.getObjectById(sourceId)),
        target: creep => creep.upgrade(),
        switch: creep => creep.updateState('📈 支援升级'),
        spawn: spawnName,
        bodyType: 'worker'
    }),

    /**
     * 外矿采集者
     * 从指定矿中挖矿 > 将矿转移到建筑中
     * 
     * @param spawnName 出生点名称
     * @param sourceFlagName 外矿旗帜的名称 (要确保 source 就在该旗帜附件)
     * @param targetId 要移动到的建筑 id
     */
    remoteHarvester: (spawnName: string, sourceFlagName: string, targetId: string): ICreepConfig => ({
        // 获取旗帜附近的 source
        prepare: creep => {
            const sourceFlag = Game.flags[sourceFlagName]
            if (!sourceFlag) {
                console.log(`找不到名称为 ${sourceFlagName} 的旗帜`)
                return creep.say('找不到外矿!')
            }

            if (!sourceFlag.room) creep.farMoveTo(sourceFlag.pos)
            else {
                const source = sourceFlag.pos.findClosestByRange(FIND_SOURCES)
                if (!source) return console.log(`${sourceFlagName} 附近没有找到 source`)
                // 找到 source 后就写入内存
                creep.memory.sourceId = source.id
            }
        },
        // 内存中是否拥有sourceId
        isReady: creep => creep.memory.sourceId ? true : false,
        // 向旗帜出发
        source: creep => {
            const sourceFlag = Game.flags[sourceFlagName]
            if (!sourceFlag) {
                console.log(`找不到名称为 ${sourceFlagName} 的旗帜`)
                return creep.say('找不到外矿!')
            }

            // 检查自己身边有没有敌人
            if (!creep.room._enemys) {
                creep.room._enemys = creep.room.find(FIND_HOSTILE_CREEPS)
            }
            // 有的话就往家跑
            if (creep.room._enemys.length > 0) {
                creep.farMoveTo(Game.spawns[spawnName].pos)
                return 
            }

            // 下面是正常开采逻辑
            // 这里的移动判断条件是 !== OK, 因为外矿有可能没视野, 下同
            if (creep.harvest(Game.getObjectById(creep.memory.sourceId)) !== OK) {
                creep.farMoveTo(sourceFlag.pos)
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
            // 再把剩余能量运回去
            if (creep.transfer(Game.getObjectById(targetId), RESOURCE_ENERGY) !== OK) {
                creep.farMoveTo(Game.getObjectById(targetId))
            }
        },
        switch: creep => creep.updateState('🍚 收获'),
        spawn: spawnName,
        bodyType: 'worker'
    })
}