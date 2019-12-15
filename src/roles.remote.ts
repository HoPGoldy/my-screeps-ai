// 占领旗帜的名称
const CLAIM_FLAG_NAME = 'claim'

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
     * @param pathRooms 路径房间名数组，可以通过该参数强制指定 creep 的移动路线（请将 creep 出生房间放在数组首位）
     */ 
    claimer: (spawnName: string, pathRooms: string[] = []): ICreepConfig => ({
        target: creep => {
            const claimFlag = creep.getFlag(CLAIM_FLAG_NAME)
            if (!claimFlag) return

            // 如果 creep 不在房间里 则一直向旗帜移动
            if (!claimFlag.room || (claimFlag.room && creep.room.name !== claimFlag.room.name)) {
                creep.farMoveTo(claimFlag.pos)
            }

            // 已经抵达了该房间
            const room = claimFlag.room
            // 如果房间已经被占领或者被预定了则攻击控制器
            if (room && (room.controller.owner !== undefined || room.controller.reservation !== undefined)) {
                if(creep.attackController(room.controller) == ERR_NOT_IN_RANGE) creep.moveTo(room.controller)
                return
            }
            // 如果房间无主则占领
            if (room && creep.claimController(room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(room.controller)
            }
        },
        spawn: spawnName,
        bodyType: 'claimer'
    }),

    /**
     * 预定者
     * 准备阶段：向指定房间控制器移动
     * 阶段A：预定控制器
     * 
     * @param spawnName 出生点名称
     * @param roomName 要预定的房间名
     */
    reserver: (spawnName: string, roomName: string): ICreepConfig => ({
        isNeed: (room) => {
            if (!room.memory.remote) room.memory.remote = {}
            // 存在该字段说明外矿有入侵者
            if (room.memory.remote[roomName]) {
                // 有该字段并且当前时间没有到其标注的时间
                // 说明外矿还有活着的入侵者
                if (Game.time < room.memory.remote[roomName]) return false
                // 否则就说明入侵者已经死了
                delete room.memory.remote[roomName]
            }

            // 如果房间没有视野则默认进行孵化
            if (!Game.rooms[roomName]) {
                // console.log('[reserver] 房间没有视野 默认孵化')
                return true
            }
            
            const controller: StructureController = Game.rooms[roomName].controller
            
            // 房间没有预定也孵化
            if (!controller.reservation) {
                // console.log('[reserver] 房间没有预定 默认孵化')
                return true
            }
            // 房间还剩 2500 ticks 预定就到期了则进行孵化
            if (controller.reservation.ticksToEnd <= 2500) return true
            // console.log(`[reserver] 房间的预定时长为 ${controller.reservation.ticksToEnd} 不予孵化`)
            // 不然不孵化
            return false
        },
        // 朝房间移动
        prepare: creep => {
            // 只要进入房间则准备结束
            if (creep.room.name == roomName) return true
            else {
                creep.farMoveTo(new RoomPosition(25, 25, roomName))
                return false
            }
        },
        // 一直进行预定
        target: creep => {
            // 如果房间的预订者不是自己, 就攻击控制器
            if (creep.room.controller.reservation && creep.room.controller.reservation.username !== Game.spawns[spawnName].owner.username) {
                if (creep.attackController(creep.room.controller) == ERR_NOT_IN_RANGE) creep.farMoveTo(Game.rooms[roomName].controller.pos)
            }
            // 房间没有预定满, 就继续预定
            if (!creep.room.controller.reservation || creep.room.controller.reservation.ticksToEnd < CONTROLLER_RESERVE_MAX) {
                if (creep.reserveController(creep.room.controller) == ERR_NOT_IN_RANGE) creep.farMoveTo(Game.rooms[roomName].controller.pos)
            }
        },
        spawn: spawnName,
        bodyType: 'reserver'
    }),

    /**
     * 签名者
     * 会先抵达指定房间, 然后执行签名
     * 
     * @param spawnName 出生点名称
     * @param targetRoomName 要签名的目标房间名
     * @param signText 要签名的内容
     * @param pathRooms 路径房间名数组，可以通过该参数强制指定 creep 的移动路线（请将 creep 出生房间放在数组首位）
     */
    signer: (spawnName: string, targetRoomName: string, signText: string, pathRooms: string[] = []): ICreepConfig => ({
        source: creep => {
            creep.farMoveTo(new RoomPosition(25, 25, targetRoomName))
        },
        target: creep => {
            if (creep.signController(creep.room.controller, signText) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, { reusePath: 30 })
            }
        },
        switch: creep => creep.room.name === targetRoomName,
        spawn: spawnName,
        bodyType: 'signer'
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
        prepare: creep => {
            // 只要进入房间则准备结束
            if (creep.room.name === targetRoomName) {
                creep.farMoveTo(new RoomPosition(25, 25, targetRoomName))
                return false
            }
            else return true
        },
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
        prepare: creep => {
            // 只要进入房间则准备结束
            if (creep.room.name === targetRoomName) {
                creep.farMoveTo(new RoomPosition(25, 25, targetRoomName))
                return false
            }
            else return true
        },
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
        // 如果外矿目前有入侵者就不生成
        isNeed: room => {
            // 旗帜效验, 没有旗帜则不生成
            if (!Game.flags[sourceFlagName]) {
                console.log(`找不到名称为 ${sourceFlagName} 的旗帜`)
                return false
            }
            // 从旗帜内存中获取房间名
            // 内存中没有房间名就说明外矿刚刚建立，默认进行生成
            const remoteRoomName = Game.flags[sourceFlagName].memory.roomName
            if (!remoteRoomName) return true

            if (!room.memory.remote) room.memory.remote = {}
            // 不存在该字段说明外矿状态良好
            if (!room.memory.remote[remoteRoomName]) return true
            // 有该字段并且当前时间没有到其标注的时间
            // 说明外矿还有活着的入侵者
            if (Game.time < room.memory.remote[remoteRoomName]) return false
            // 否则就说明入侵者已经死了
            delete room.memory.remote[remoteRoomName]
            return true
        },
        // 获取旗帜附近的 source
        prepare: creep => {
            if (!creep.memory.sourceId) {
                const sourceFlag = Game.flags[sourceFlagName]
                // 旗帜所在房间没视野, 就进行移动
                if (!sourceFlag.room) creep.farMoveTo(sourceFlag.pos)
                else {
                    // 缓存外矿房间名
                    sourceFlag.memory.roomName = sourceFlag.room.name
                    const source = sourceFlag.pos.findClosestByRange(FIND_SOURCES)
                    if (!source) {
                        console.log(`${sourceFlagName} 附近没有找到 source`)
                        return false
                    }
                    // 找到 source 后就写入内存
                    creep.memory.sourceId = source.id

                    // 再检查下有没有工地, 没有则以后再也不检查
                    const constructionSites = sourceFlag.room.find(FIND_CONSTRUCTION_SITES)
                    if (constructionSites.length <= 0)
                    creep.memory.dontBuild = true
                }
                return false
            }
            else return true
        },
        // 向旗帜出发
        source: creep => {
            const sourceFlag = Game.flags[sourceFlagName]

            // 检查房间内有没有敌人，10 tick 检查一次
            if (!(Game.time % 10) && sourceFlag.room) {
                if (!sourceFlag.room._hasEnemy) {
                    sourceFlag.room._hasEnemy = sourceFlag.room.find(FIND_HOSTILE_CREEPS).length > 0
                }
                // 有的话向基地报告
                if (sourceFlag.room._hasEnemy) {
                    const spawn = Game.spawns[spawnName]
                    if (!spawn) return console.log(`${creep.name} 在 source 阶段中找不到 ${spawnName}`)
                    if (!spawn.room.memory.remote) spawn.room.memory.remote = {}
                    // 如果还没有设置重生时间的话
                    if (!spawn.room.memory.remote[sourceFlag.room.name]) {
                        // 将重生时间设置为 1500 tick 之后
                        spawn.room.memory.remote[sourceFlag.room.name] = Game.time + 1500
                    }
                }
            }
            
            const harvestResult = creep.harvest(Game.getObjectById(creep.memory.sourceId))
            // 一旦被 core 占领就不再生成
            if (harvestResult == ERR_NOT_OWNER && !(Game.time % 20)) {
                const core = creep.room.find(FIND_STRUCTURES, {
                    filter: s => s.structureType == STRUCTURE_INVADER_CORE
                })

                // 发现入侵者 core
                if (core.length > 0) {
                    const spawn = Game.spawns[spawnName]
                    if (!spawn) return console.log(`${creep.name} 在 source 阶段中找不到 ${spawnName}`)
                    if (!spawn.room.memory.remote) spawn.room.memory.remote = {}
                    // 如果还没有设置重生时间的话
                    if (!spawn.room.memory.remote[sourceFlag.room.name]) {
                        const collapseTimerEffect = core[0].effects.find(e => e.effect == EFFECT_COLLAPSE_TIMER)

                        if (collapseTimerEffect) {
                            /**
                             * @danger core 消失之后还有 4000 tick 无法采集
                             * 但是由于 remoteHarvester 和 reserver 生成用的是同一个计时器
                             * 所以在 core 消失之后依旧会直接生成 remoteHarvester 在 source 前傻站至多 4000 tick
                             */
                            // 将重生时间设置为 core 消失之后
                            spawn.room.memory.remote[sourceFlag.room.name] = Game.time + collapseTimerEffect.ticksRemaining
                        }
                    }
                }
            }
            // 这里的移动判断条件是 !== OK, 因为外矿有可能没视野, 下同
            else if (harvestResult !== OK) {
                creep.farMoveTo(sourceFlag.pos)
            }
        },
        target: creep => {
            // dontBuild 为 false 时表明还在建造阶段
            if (!creep.memory.dontBuild) {
                // 没有可建造的工地后就再也不建造
                if (!creep.buildStructure()) {
                    creep.memory.dontBuild = true
                    delete creep.memory.constructionSiteId
                }
                return
            }

            // 检查脚下的路有没有问题，有的话就进行维修
            const structures = creep.pos.lookFor(LOOK_STRUCTURES)
            if (structures.length > 0) {
                const road = structures[0]
                if (road.hits < road.hitsMax) creep.repair(road)
            }
            
            // 再把剩余能量运回去
            if (creep.transfer(Game.getObjectById(targetId), RESOURCE_ENERGY) !== OK) {
                creep.farMoveTo(Game.getObjectById(targetId))
            }
        },
        switch: creep => creep.updateState('🍚 收获'),
        spawn: spawnName,
        bodyType: 'remoteHarvester'
    }),

    /**
     * 外矿防御者
     * 抵达指定房间 > 待命 > 攻击敌人
     * RCL < 3 时生成的防御者可能不足以消灭入侵者
     * 
     * @param spawnName 出生点名称
     * @param roomName 要守卫的房间名称
     */
    remoteDefender: (spawnName: string, roomName: string): ICreepConfig => ({
        // 向指定房间移动
        prepare: creep => {
            // 只要进入房间则准备结束
            if (creep.room.name === roomName) {
                creep.farMoveTo(new RoomPosition(25, 25, roomName))
                return false
            }
            else return true
        },
        source: creep => creep.standBy(),
        target: creep => creep.defense(),
        switch: creep => creep.checkEnemy(),
        spawn: spawnName,
        bodyType: 'remoteDefender'
    }),
}