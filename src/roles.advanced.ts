/**
 * 高级房间运营角色组
 * 本角色组包括了有 Storage 和 Link 的房间内运维所需的角色
 */
export default {
    /**
     * 运输者
     * 从 Storage 中获取能量，并填充 Spawn Extension 和 Tower
     * 
     * @param spawnName 出生点名称
     * @param sourceId 从该建筑中获取能量 (可选, 默认 Storage)
     */
    transfer: (spawnName: string, sourceId: string = null): ICreepConfig => ({
        source: creep => creep.getEngryFrom(sourceId ? Game.getObjectById(sourceId) : creep.room.storage),
        target: creep => {
            // 获取有需求的建筑
            const target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                filter: s => (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_TOWER) && s.energy < s.energyCapacity
            })
            if (!target) return
            // 有的话就填充能量
            if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) creep.moveTo(target)
        },
        switch: creep => creep.store[RESOURCE_ENERGY] > 0,
        spawn: spawnName,
        bodyType: 'transfer'
    }),

    /**
     * 中心搬运者
     * 从 centerLink 中获取能量，并填充 Storage
     * 
     * @param x 要移动到的 x 坐标
     * @param y 要移动到的 y 坐标
     * @param centerLinkId 中央 link 的 id
     * @param spawnName 出生点名称
     */
    centerTransfer: (x: number, y: number, spawnName: string): ICreepConfig => ({
        // 移动到指定位置
        prepare: creep => creep.moveTo(x, y),
        isReady: creep => creep.pos.isEqualTo(x, y),
        // link 里有能量就拿出来
        source: creep => {
            const task = creep.room.getTask()
            if (!task) return creep.say('没活了')

            const structure: AnyStructure = Game.getObjectById(task.sourceId)
            const result = creep.withdraw(structure, task.resourceType)
            if (result !== OK) creep.say(`ERROR ${result}`)
        },
        // 身上有能量就放到 Storage 里
        target: creep => {
            const task = creep.room.getTask()
            if (!task) return

            // 提前获取携带量
            const amount: number = creep.store.getUsedCapacity(task.resourceType)

            const structure: AnyStructure = Game.getObjectById(task.targetId)
            const result = creep.transfer(structure, task.resourceType)
            // 如果转移完成则增加任务进度
            if (result === OK) creep.room.handleTask(amount)
            else creep.say(`ERROR ${result}`)
        },
        switch: creep => creep.store.getUsedCapacity() > 0,
        spawn: spawnName,
        bodyType: 'transfer'
    }),

    /**
     * 静态采集者
     * 从 source 中获取能量，并转移到指定建筑
     * 注意！该角色一旦就位将不会再次移动，请保证指定建筑就在 Source 附件
     * 
     * @param sourceId 能量矿id
     * @param targetId 目标建筑id
     * @param spawnName 出生点名称
     */
    staticHarvester: (sourceId: string, targetId: string, spawnName: string): ICreepConfig => ({
        // 移动到指定位置
        prepare: creep => creep.moveTo(Game.getObjectById(sourceId)),
        isReady: creep => creep.harvest(Game.getObjectById(sourceId)) === OK,
        // 一直采矿
        source: creep => creep.harvest(Game.getObjectById(sourceId)),
        // 采完了就放起来
        target: creep => creep.transfer(Game.getObjectById(targetId), RESOURCE_ENERGY),
        switch: creep => creep.updateState('🍚 收获'),
        spawn: spawnName,
        bodyType: 'worker'
    }),

    /**
     * 静态升级者
     * 从指定结构中获取能量，并升级控制器
     * 注意！该角色一旦就位将不会再次移动，请保证指定建筑就在 controller 附件
     * 
     * @param sourceId 用来获取能量的建筑id
     * @param spawnName 出生点名称
     */
    staticUpgrader: (sourceId: string, spawnName: string): ICreepConfig => ({
        // 移动到指定位置
        prepare: creep => creep.moveTo(Game.getObjectById(sourceId)),
        isReady: creep => creep.harvest(Game.getObjectById(sourceId)) === OK,
        // 拿出来能量
        source: creep => creep.withdraw(Game.getObjectById(sourceId), RESOURCE_ENERGY),
        // 拿完了就升级控制器
        target: creep => creep.upgradeController(creep.room.controller),
        switch: creep => creep.store[RESOURCE_ENERGY] > 0,
        spawn: spawnName,
        bodyType: 'worker'
    }),
}