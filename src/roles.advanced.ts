/**
 * 高级房间运营角色组
 * 本角色组包括了有 Storage 和 Link 的房间内运维所需的角色
 */
export default {
    /**
     * 新运输者
     * 从 Storage 中获取能量，并填充 Spawn Extension 和 Tower
     * 
     * @param spawnName 出生点名称
     * @param sourceId 从该建筑中获取能量 (可选, 默认 Storage)
     */
    transfer: (spawnName: string, sourceId: string = null): ICreepConfig => ({
        source: creep => {
            const task = getRoomTransferTask(creep.room)

            // 有任务就执行
            if (task) transferTaskOperations[task.type].source(creep, task, sourceId)
        },
        target: creep => {
            const task = getRoomTransferTask(creep.room)

            // 有任务就执行
            if (task) transferTaskOperations[task.type].target(creep, task)
        },
        switch: creep => {
            const task = getRoomTransferTask(creep.room)

            // 有任务就进行判断
            if (task) return transferTaskOperations[task.type].switch(creep, task)
            else {
                creep.say('💤')
                return false
            }
        },
        spawn: spawnName,
        bodyType: 'transfer'
    }),

    /**
     * 中心搬运者
     * 从 centerLink 中获取能量，并填充 Storage
     * 
     * @param spawnName 出生点名称
     * @param x 要移动到的 x 坐标
     * @param y 要移动到的 y 坐标
     * @param centerLinkId 中央 link 的 id
     */
    centerTransfer: (spawnName: string, x: number, y: number): ICreepConfig => ({
        // 移动到指定位置
        prepare: creep => creep.moveTo(x, y, { reusePath: 20 }),
        isReady: creep => creep.pos.isEqualTo(x, y),
        // 从中央任务队列中取出任务并执行
        source: creep => {
            // 快死了就拒绝执行任务
            if (creep.ticksToLive <= 5) return
            // 获取任务
            const task = creep.room.getCenterTask()
            if (!task) return 

            // 找到建筑
            const structure: AnyStructure = Game.getObjectById(task.sourceId)
            if (!structure) {
                creep.room.deleteCurrentCenterTask()
                return
            }

            // 尝试取出资源
            const result = creep.withdraw(structure, task.resourceType)
            if (result === ERR_NOT_ENOUGH_RESOURCES) {
                creep.room.deleteCurrentCenterTask()
            }
            else if (result !== OK) {
                creep.say(`取出 ${result}`)
                creep.room.hangCenterTask()
            }
        },
        // 身上有能量就放到 Storage 里
        target: creep => {
            const task = creep.room.getCenterTask()
            if (!task) return

            // 提前获取携带量
            const amount: number = creep.store.getUsedCapacity(task.resourceType)

            const structure: AnyStructure = Game.getObjectById(task.targetId)
            if (!structure) {
                creep.room.deleteCurrentCenterTask()
                return
            }
            
            const result = creep.transfer(structure, task.resourceType)
            // 如果转移完成则增加任务进度
            if (result === OK) creep.room.handleCenterTask(amount)
            else {
                creep.say(`存入 ${result}`)
                creep.room.hangCenterTask()
            }
        },
        switch: creep => creep.store.getUsedCapacity() > 0,
        spawn: spawnName,
        bodyType: 'centerTransfer'
    })
}

/**
 * 获取指定房间的物流任务
 * 
 * @param room 要获取物流任务的房间名
 */
const getRoomTransferTask = function(room: Room): RoomTransferTasks | null {
    const task = room.getRoomTransferTask()
    if (!task) return null

    // 如果任务类型不对就移除任务并报错退出
    if (!transferTaskOperations.hasOwnProperty(task.type)) {
        room.deleteCurrentRoomTransferTask()
        console.log(`[transfer 异常] ${room.name} 出现了未定义的房间物流任务 ${task.type}`)
        return null
    }

    return task
}

/**
 * transfer 在应对不同类型的任务时执行的操作
 * 该对象的属性名即为任务类型
 */
const transferTaskOperations: { [taskType: string]: transferTaskOperation } = {
    fillExtension: {
        source: (creep, task, sourceId) => creep.getEngryFrom(sourceId ? Game.getObjectById(sourceId) : creep.room.storage),
        target: creep => {
            let target: StructureExtension
            
            // 有缓存就用缓存
            if (creep.memory.fillStructureId) {
                target = <StructureExtension>Game.getObjectById(creep.memory.fillStructureId)

                // 如果找不到对应的建筑或者已经填满了就移除缓存
                if (!target || target.structureType !== STRUCTURE_EXTENSION || target.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                    delete creep.memory.fillStructureId
                    target = undefined
                }
            }

            // 没缓存就重新获取
            if (!target) {
                // 获取有需求的建筑
                target = <StructureExtension>creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                    // extension 中的能量没填满
                    filter: s => (s.structureType == STRUCTURE_EXTENSION && (s.store.getFreeCapacity(RESOURCE_ENERGY) > 0))
                })
                if (!target) {
                    // 都填满了，任务完成
                    // console.log(`[物流任务] ${creep.room.name} 关闭了 fillExtension 任务`)
                    creep.room.handleRoomTransferTask()
                    return
                }

                // 写入缓存
                creep.memory.fillStructureId = target.id
            }

            // 有的话就填充能量
            const transferResult = creep.transfer(target, RESOURCE_ENERGY)
            if (transferResult === ERR_NOT_IN_RANGE) creep.moveTo(target, { reusePath: 20 })
            else if (transferResult != OK) creep.say(`错误! ${transferResult}`)
        },
        switch: creep => creep.store[RESOURCE_ENERGY] > 0
    },
    fillTower: {
        source: (creep, task, sourceId) => creep.getEngryFrom(sourceId ? Game.getObjectById(sourceId) : creep.room.storage),
        target: (creep, task: IFillTower) => {
            let target: StructureTower

            // 有缓存的话
            if (creep.memory.fillStructureId) {
                target = <StructureTower>Game.getObjectById(creep.memory.fillStructureId)
                
                // 如果找不到对应的建筑或者已经填到 900 了就移除缓存
                if (!target || target.structureType !== STRUCTURE_TOWER || target.store[RESOURCE_ENERGY] > 900) {
                    delete creep.memory.fillStructureId
                    target = undefined 
                }
            }
            
            // 有缓存的话
            if (!target) {
                // 先检查下任务发布 tower 能量是否足够
                target = Game.getObjectById(task.id)
                if (!target || target.store[RESOURCE_ENERGY] > 900) {
                    // 然后再检查下还有没有其他 tower 没填充
                    const towers = creep.room.find(FIND_MY_STRUCTURES, {
                        filter: s => s.structureType === STRUCTURE_TOWER && s.store[RESOURCE_ENERGY] <= 900
                    })
                    // 如果还没找到的话就算完成任务了
                    if (towers.length <= 0) {
                        creep.room.handleRoomTransferTask()
                        return
                    }
                    target = creep.pos.findClosestByPath(towers) as StructureTower
                }

                // 写入缓存
                creep.memory.fillStructureId = target.id
            }

            // 有的话就填充能量
            const transferResult = creep.transfer(target, RESOURCE_ENERGY)
            if (transferResult === ERR_NOT_IN_RANGE) creep.moveTo(target, { reusePath: 20 })
            else if (transferResult != OK) creep.say(`错误! ${transferResult}`)
        },
        switch: creep => creep.store[RESOURCE_ENERGY] > 0
    }
}