export const ROOM_TRANSFER_TASK = {
    FILL_EXTENSION: 'fillExtension',
    FILL_TOWER: 'fillTower',
    FILL_NUKER: 'fillNuker',
    LAB_IN: 'labIn',
    LAB_OUT: 'labOut',
    LAB_GET_ENERGY: 'labGetEnergy',
    FILL_POWERSPAWN: 'fillPowerSpawn'
}

/**
 * 高级房间运营角色组
 * 本角色组包括了有 Storage 和 Link 的房间内运维所需的角色
 */
export default {
    /**
     * 房间物流运输者
     * 执行 ROOM_TRANSFER_TASK 中定义的任务
     * 任务处理逻辑定义在 transferTaskOperations 中
     * 
     * @param spawnName 出生点名称
     * @param sourceId 从该建筑中获取能量 (可选, 默认 Storage)
     */
    transfer: (spawnName: string, sourceId: string = null): ICreepConfig => ({
        source: creep => {
            if (creep.ticksToLive <= 20) return deathPrepare(creep, sourceId)

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
            // 快死了就处理后事
            if (creep.ticksToLive <= 20) {
                creep.say('下辈子再干')
                return false
            }

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
     * 从房间的中央任务队列 Room.memory.centerTransferTasks 中取出任务并执行
     * 
     * @param spawnName 出生点名称
     * @param x 要移动到的 x 坐标
     * @param y 要移动到的 y 坐标
     * @param centerLinkId 中央 link 的 id
     */
    centerTransfer: (spawnName: string, x: number, y: number): ICreepConfig => ({
        // 移动到指定位置
        prepare: creep => {
            if (creep.pos.isEqualTo(x, y)) return true
            else {
                creep.moveTo(x, y, { reusePath: 20 })
                return false
            }
        },
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
 * 快死时的后事处理
 * 将资源存放在对应的地方
 * 存完了就自杀
 * 
 * @param creep transfer
 * @param sourceId 能量存放处
 */
const deathPrepare = function(creep: Creep, sourceId: string): void {
    if (creep.store.getUsedCapacity() > 0) {
        for (const resourceType in creep.store) {
            let target: StructureStorage | StructureTerminal
            // 不是能量就放到 terminal 里
            if (resourceType != RESOURCE_ENERGY&&resourceType!=RESOURCE_POWER && creep.room.terminal) {
                target = creep.room.terminal
            }
            // 否则就放到 storage 或者玩家指定的地方
            else target = sourceId ? Game.getObjectById(sourceId) as StructureStorage : creep.room.storage

            // 转移资源
            if (creep.transfer(target, <ResourceConstant>resourceType) == ERR_NOT_IN_RANGE) creep.moveTo(target, { reusePath: 20 })
            
            break
        }
    }
    else creep.suicide()
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
    /**
     * extension 填充任务
     * 维持正常孵化的任务
     * 
     * 注：因为有些 spawn 放的比较远，所以这里只会填充 extension 而不是 spawn。
     */
    [ROOM_TRANSFER_TASK.FILL_EXTENSION]: {
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

    /**
     * tower 填充任务
     * 维持房间内所有 tower 的能量
     */
    [ROOM_TRANSFER_TASK.FILL_TOWER]: {
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
    },

    /**
     * nuker 填充任务
     * 由 nuker 在 Nuker.work 中发布
     * 任务的搬运量取决于 transfer 的最大存储量，搬一次就算任务完成
     */
    [ROOM_TRANSFER_TASK.FILL_NUKER]: {
        source: (creep, task: IFillNuker, sourceId) => {
            // 获取资源存储建筑
            let sourceStructure: StructureStorage | StructureTerminal
            if (task.resourceType == RESOURCE_ENERGY) sourceStructure = sourceId ? Game.getObjectById(sourceId) : creep.room.storage
            else sourceStructure = creep.room.terminal
            // 获取 nuker
            const nuker: StructureNuker = Game.getObjectById(task.id)

            // 兜底
            if (!sourceStructure || !nuker) {
                creep.room.deleteCurrentRoomTransferTask()
                return console.log(`[${creep.name}] nuker 填充任务，未找到 Storage 或者 Nuker`)
            }

            // 获取应拿取的数量
            let getAmount = creep.store.getCapacity() < nuker.store.getFreeCapacity(task.resourceType) ?
                creep.store.getFreeCapacity() :
                nuker.store.getFreeCapacity(task.resourceType)
            // 没那么多的话就有多少拿多少
            if (sourceStructure.store[task.resourceType] < getAmount) getAmount = sourceStructure.store[task.resourceType]
            
            if (getAmount <= 0) {
                creep.room.deleteCurrentRoomTransferTask()
                return console.log(`[${creep.name}] nuker 填充任务，资源不足`)
            }
            
            // 拿取资源
            const getResult = creep.withdraw(sourceStructure, task.resourceType, getAmount)
            if (getResult == ERR_NOT_IN_RANGE) creep.moveTo(sourceStructure, { reusePath: 20 })
            else if (getResult != OK) console.log(`[${creep.name}] nuker 填充任务，withdraw`, getResult)
        },
        target: (creep, task: IFillNuker) => {
            // 获取 nuker 及兜底
            let target: StructureNuker = Game.getObjectById(task.id)
            if (!target) return creep.room.deleteCurrentRoomTransferTask()

            // 转移资源
            const transferResult = creep.transfer(target, task.resourceType)
            if (transferResult === ERR_NOT_IN_RANGE) creep.moveTo(target, { reusePath: 20 })
            else if (transferResult == OK) {
                creep.room.handleRoomTransferTask()
                // console.log(`[${creep.name}] 完成 nuker 填充任务`)
            }
            else creep.say(`错误! ${transferResult}`)
        },
        switch: (creep, task: IFillNuker) => creep.store[task.resourceType] > 0
    },

    /**
     * lab 资源移入任务
     * 在 lab 集群的 getResource 阶段发布
     * 在 inLab 中填充两种底物
     * 并不会填满，而是根据自己最大的存储量进行填充，保证在取出产物时可以一次搬完
     */
    [ROOM_TRANSFER_TASK.LAB_IN]: {
        source: (creep, task: ILabIn, sourceId) => {
            // 获取 terminal
            const terminal = creep.room.terminal
            if (!terminal) {
                creep.room.deleteCurrentRoomTransferTask()
                return console.log(`[${creep.name}] labin, 未找到 terminal，任务已移除`)
            }

            // 把多余的能量放终端里
            if (creep.store[RESOURCE_ENERGY] > 0) return creep.transferTo(terminal, RESOURCE_ENERGY)

            // 找到第一个需要的底物，然后从终端拿出
            const targetResource = task.resource.find(res => res.amount > 0)
            
            // 找不到了就说明都成功转移了
            if (!targetResource) {
                creep.room.deleteCurrentRoomTransferTask()
                return
            }

            const getAmount = targetResource.amount > creep.store.getFreeCapacity() ?
                creep.store.getFreeCapacity() :
                targetResource.amount

            if (creep.withdraw(terminal, targetResource.type, getAmount) == ERR_NOT_IN_RANGE) creep.moveTo(terminal, { reusePath: 20 })
        },
        target: (creep, task: ILabIn) => {
            const targetResource = task.resource.find(res => res.amount > 0)
            // 找不到了就说明都成功转移了
            if (!targetResource) {
                creep.room.deleteCurrentRoomTransferTask()
                return
            }
            
            const targetLab: StructureLab = Game.getObjectById(targetResource.id)

            // 转移资源
            const transferResult = creep.transfer(targetLab, targetResource.type)
            if (transferResult === ERR_NOT_IN_RANGE) creep.moveTo(targetLab, { reusePath: 20 })
            // 正常转移资源则更新任务
            else if (transferResult == OK) {
                // 这里直接更新到 0 的原因是因为这样可以最大化运载效率
                // 保证在产物移出的时候可以一次就拿完
                creep.room.handleLabInTask(targetResource.type, 0)
                // console.log(`[${creep.name}] 完成 labin 填充任务`)
            }
            else creep.say(`错误! ${transferResult}`)
        },
        // 只要 creep 存储里有需要的资源就执行 target
        switch: (creep, task: ILabIn) => task.resource.find(res => creep.store[res.type] > 0) ? true : false
    },

    /**
     * lab 能量填充任务
     * 在 boost 阶段发布
     * 将给指定的 lab 填满能量
     */
    [ROOM_TRANSFER_TASK.LAB_GET_ENERGY]: {
        source: (creep, task, sourceId) => creep.getEngryFrom(sourceId ? Game.getObjectById(sourceId) : creep.room.storage),
        target: creep => {
            const labMemory = creep.room.memory.lab
            
            // 获取能量为空的 lab
            let targetLab: StructureLab
            for (const labId of [...labMemory.inLab, ...Object.keys(labMemory.outLab)]) {
                const lab: StructureLab = Game.getObjectById(labId)
                if (lab && lab.store[RESOURCE_ENERGY] != LAB_ENERGY_CAPACITY) {
                    targetLab = lab
                    break
                }
            }

            // 找不到就说明任务完成
            if (!targetLab) {
                creep.room.deleteCurrentRoomTransferTask()
                return
            }

            // 转移资源
            const transferResult = creep.transfer(targetLab, RESOURCE_ENERGY)
            if (transferResult === ERR_NOT_IN_RANGE) creep.moveTo(targetLab, { reusePath: 20 })
            // 正常转移资源则更新任务
            else if (transferResult != OK) creep.say(`错误! ${transferResult}`)
        },
        switch: creep => creep.store[RESOURCE_ENERGY] > 0
    },

    /**
     * lab 产物移出任务
     * 将 lab 的反应产物统一从 outLab 中移动到 terminal 中
     */
    [ROOM_TRANSFER_TASK.LAB_OUT]: {
        source: (creep, task: ILabOut) => {
            const labMemory = creep.room.memory.lab

            // 获取还有资源的 lab
            let targetLab: StructureLab
            for (const outLabId in labMemory.outLab) {
                if (labMemory.outLab[outLabId] > 0){
                    targetLab = Game.getObjectById(outLabId)
                    break
                }
            }

            // 找不到的话就说明任务完成
            if (!targetLab) {
                creep.room.deleteCurrentRoomTransferTask()
                return
            }

            // 自己还拿着能量就先放到终端里
            if (!creep.room.terminal) {
                creep.room.deleteCurrentRoomTransferTask()
                return console.log(`[${creep.name}] labout, 未找到 terminal，任务已移除`)
            }
            if (creep.store[RESOURCE_ENERGY] > 0) return creep.transferTo(creep.room.terminal, RESOURCE_ENERGY)

            // 转移资源
            const withdrawResult = creep.withdraw(targetLab, task.resourceType)
            if (withdrawResult === ERR_NOT_IN_RANGE) creep.moveTo(targetLab, { reusePath: 20 })
            // 正常转移资源则更新 memory 数量信息
            else if (withdrawResult == OK) {
                creep.room.memory.lab.outLab[targetLab.id] = targetLab.mineralType ? targetLab.store[targetLab.mineralType] : 0
            }
            else creep.say(`draw ${withdrawResult}`)
        },
        target: (creep, task: ILabOut) => {
            const terminal = creep.room.terminal

            /**
             * @todo 没有 terminal 应该把资源转移到其他储藏里
             */
            if (!terminal) {
                creep.room.deleteCurrentRoomTransferTask()
                return console.log(`[${creep.name}] labin, 未找到 terminal，任务已移除`)
            }

            // 转移资源
            const transferResult = creep.transfer(terminal, task.resourceType)
            if (transferResult === ERR_NOT_IN_RANGE) creep.moveTo(terminal, { reusePath: 20 })
            // 正常转移资源则更新任务
            else if (transferResult != OK) creep.say(`labout ${transferResult}`)
        },
        switch: (creep, task: ILabOut) => {
            const carry = creep.store.getCapacity()
            // 装满了就 target 阶段
            if (creep.store.getFreeCapacity() == 0) return true
            // 完全没有携带指定资源就 source 阶段
            else if (!creep.store[task.resourceType]) return false

            // 没有就检查下有没有没搬完的
            const labMemory = creep.room.memory.lab
            const hasNotEvacuated = Object.keys(labMemory.outLab).find(outLabId => labMemory.outLab[outLabId] > 0)

            return hasNotEvacuated ? false : true
        }
    },
    /**
     * powerspawn 填充任务
     * 由 powerSpawn 在 powerSpawn.work 中发布
     * 任务的搬运量取决于 transfer 的最大存储量，搬一次就算任务完成
     */
    [ROOM_TRANSFER_TASK.FILL_POWERSPAWN]: {
        source: (creep, task: IFillPowerSpawn, sourceId) => {
            // 获取资源存储建筑
            let sourceStructure: StructureStorage | StructureTerminal
            if (task.resourceType == RESOURCE_ENERGY) sourceStructure = sourceId ? Game.getObjectById(sourceId) : creep.room.storage
            else sourceStructure = creep.room.storage
            // 获取 powerspawn
            const powerspawn: StructurePowerSpawn = Game.getObjectById(task.id)

            // 兜底
            if (!sourceStructure || !powerspawn) {
                creep.room.deleteCurrentRoomTransferTask()
                return console.log(`[${creep.name}] powerSpawn 填充任务，未找到 Storage 或者 powerSpawn`)
            }

            // 获取应拿取的数量
            let getAmount = creep.store.getCapacity() < powerspawn.store.getFreeCapacity(task.resourceType) ?
                creep.store.getFreeCapacity() :
                powerspawn.store.getFreeCapacity(task.resourceType)
            // 没那么多的话就有多少拿多少
            if (sourceStructure.store[task.resourceType] < getAmount) getAmount = sourceStructure.store[task.resourceType]
            
            if (getAmount <= 0) {
                creep.room.deleteCurrentRoomTransferTask()
                return console.log(`[${creep.name}] powerSpawn 填充任务，资源不足`)
            }
            
            // 拿取资源
            const getResult = creep.withdraw(sourceStructure, task.resourceType, getAmount)
            if (getResult == ERR_NOT_IN_RANGE) creep.moveTo(sourceStructure, { reusePath: 20 })
            else if (getResult != OK) console.log(`[${creep.name}] powerSpawn 填充任务，withdraw`, getResult)
        },
        target: (creep, task: IFillNuker) => {
            // 获取 powerSpawn 及兜底
            let target: StructurePowerSpawn = Game.getObjectById(task.id)
            if (!target) return creep.room.deleteCurrentRoomTransferTask()

            // 转移资源
            const transferResult = creep.transfer(target, task.resourceType)
            if (transferResult === ERR_NOT_IN_RANGE) creep.moveTo(target, { reusePath: 20 })
            else if (transferResult == OK) {
                creep.room.handleRoomTransferTask()
                // console.log(`[${creep.name}] 完成 nuker 填充任务`)
            }
            else creep.say(`错误! ${transferResult}`)
        },
        switch: (creep, task: IFillPowerSpawn) => creep.store[task.resourceType] > 0
    },
}

