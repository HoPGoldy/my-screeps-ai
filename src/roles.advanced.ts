import { ROOM_TRANSFER_TASK, boostResourceReloadLimit } from "./setting"

/**
 * tranfser 触发后事处理的最小生命
 */
const TRANSFER_DEATH_LIMIT = 20

/**
 * 高级房间运营角色组
 * 本角色组包括了有 Storage 和 Link 的房间内运维所需的角色
 */
const roles: {
    [role in AdvancedRoleConstant]: (data: CreepData) => ICreepConfig
} = {
    /**
     * 房间物流运输者
     * 执行 ROOM_TRANSFER_TASK 中定义的任务
     * 任务处理逻辑定义在 transferTaskOperations 中
     */
    transfer: (data: WorkerData): ICreepConfig => ({
        source: creep => {
            if (creep.ticksToLive <= TRANSFER_DEATH_LIMIT) return deathPrepare(creep, data.sourceId)

            const task = getRoomTransferTask(creep.room)

            // 有任务就执行
            if (task) return transferTaskOperations[task.type].source(creep, task, data.sourceId)
            else creep.say('💤')
        },
        target: creep => {
            const task = getRoomTransferTask(creep.room)

            // 有任务就执行
            
            if (task) return transferTaskOperations[task.type].target(creep, task)
            else return true
        },
        bodys: 'transfer'
    }),

    /**
     * 中心搬运者
     * 从房间的中央任务队列 Room.memory.centerTransferTasks 中取出任务并执行
     * 
     * @param spawnRoom 出生房间名称
     * @param x 要移动到的 x 坐标
     * @param y 要移动到的 y 坐标
     * @param centerLinkId 中央 link 的 id
     */
    centerTransfer: (data: CenterTransferData): ICreepConfig => ({
        // 移动到指定位置
        prepare: creep => {
            if (creep.pos.isEqualTo(data.x, data.y)) return true
            else {
                creep.goTo(new RoomPosition(data.x, data.y, creep.room.name))
                return false
            }
        },
        // 从中央任务队列中取出任务并执行
        source: creep => {
            // 快死了就拒绝执行任务
            if (creep.ticksToLive <= 5) return false
            // 获取任务
            const task = creep.room.getCenterTask()
            if (!task) return false

            // 通过房间基础服务获取对应的建筑
            const structure: AnyStructure = creep.room[task.source]
            if (!structure) {
                creep.room.deleteCurrentCenterTask()
                return false
            }

            // 获取取出数量
            let withdrawAmount = creep.store.getFreeCapacity()
            if (withdrawAmount > task.amount) withdrawAmount = task.amount
            // 尝试取出资源
            const result = creep.withdraw(structure, task.resourceType, withdrawAmount)
            if (result === OK) return true
            // 资源不足就移除任务
            else if (result === ERR_NOT_ENOUGH_RESOURCES) creep.room.deleteCurrentCenterTask()
            // 够不到就移动过去
            else if (result === ERR_NOT_IN_RANGE) creep.goTo(structure.pos)
            else if (result === ERR_FULL) return true
            else {
                console.log(`[${creep.name}] source 阶段取出异常，错误码 ${result}`)
                creep.room.hangCenterTask()
            }

            return false
        },
        // 将资源移动到指定建筑
        target: creep => {
            // 没有任务就返回 source 阶段待命
            const task = creep.room.getCenterTask()
            if (!task) return true

            // 提前获取携带量
            const amount: number = creep.store.getUsedCapacity(task.resourceType)

            // 通过房间基础服务获取对应的建筑
            const structure: AnyStructure = creep.room[task.target]
            if (!structure) {
                creep.room.deleteCurrentCenterTask()
                return false
            }
            
            const result = creep.transfer(structure, task.resourceType)
            // 如果转移完成则增加任务进度
            if (result === OK) {
                creep.room.handleCenterTask(amount)
                return true
            }
            // 如果目标建筑物太远了，就移动过去
            else if (result === ERR_NOT_IN_RANGE) creep.goTo(structure.pos)
            else if (result === ERR_FULL) {
                creep.say(`${task.target} 满了`)
                if (task.target === STRUCTURE_TERMINAL) Game.notify(`[${creep.room.name}] ${task.target} 满了，请尽快处理`)
                creep.room.hangCenterTask()
            }
            // 资源不足就返回 source 阶段
            else if (result === ERR_NOT_ENOUGH_RESOURCES) {
                creep.say(`取出资源`)
                return true
            }
            else {
                creep.say(`存入 ${result}`)
                creep.room.hangCenterTask()
            }
 
            return false
        },
        bodys: 'centerTransfer'
    })
}

export default roles

/**
 * 快死时的后事处理
 * 将资源存放在对应的地方
 * 存完了就自杀
 * 
 * @param creep transfer
 * @param sourceId 能量存放处
 */
const deathPrepare = function(creep: Creep, sourceId: string): false {
    if (creep.store.getUsedCapacity() > 0) {
        for (const resourceType in creep.store) {
            let target: StructureStorage | StructureTerminal
            // 不是能量就放到 terminal 里
            if (resourceType != RESOURCE_ENERGY && resourceType != RESOURCE_POWER && creep.room.terminal) {
                target = creep.room.terminal
            }
            // 否则就放到 storage 或者玩家指定的地方
            else target = sourceId ? Game.getObjectById<StructureStorage>(sourceId): creep.room.storage

            // 转移资源
            const transferResult = creep.transfer(target, <ResourceConstant>resourceType)
            if (transferResult == ERR_NOT_IN_RANGE) creep.goTo(target.pos)
            
            return false
        }
    }
    else creep.suicide()

    return false
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
        console.log(`[${room.name} transfer] 发现未定义的房间物流任务 ${task.type}, 已移除`)
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
        source: (creep, task, sourceId) => {
            if (creep.store[RESOURCE_ENERGY] > 0) return true
            creep.getEngryFrom(sourceId ? Game.getObjectById(sourceId) : creep.room.storage)
        },
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
                    filter: s => ((s.structureType == STRUCTURE_EXTENSION || s.structureType == STRUCTURE_SPAWN) && (s.store.getFreeCapacity(RESOURCE_ENERGY) > 0))
                })
                if (!target) {
                    // 都填满了，任务完成
                    // console.log(`[物流任务] ${creep.room.name} 关闭了 fillExtension 任务`)
                    creep.room.handleRoomTransferTask()
                    return true
                }

                // 写入缓存
                creep.memory.fillStructureId = target.id
            }

            // 有的话就填充能量
            const transferResult = creep.transfer(target, RESOURCE_ENERGY)
            if (transferResult === ERR_NOT_IN_RANGE) creep.goTo(target.pos)
            else if (transferResult === ERR_NOT_ENOUGH_RESOURCES) return true
            else if (transferResult != OK) creep.say(`拓展填充错误! ${transferResult}`)

            if (creep => creep.store[RESOURCE_ENERGY] === 0) return true
        }
    },

    /**
     * tower 填充任务
     * 维持房间内所有 tower 的能量
     */
    [ROOM_TRANSFER_TASK.FILL_TOWER]: {
        source: (creep, task, sourceId) => {
            if (creep.store[RESOURCE_ENERGY] > 0) return true
            creep.getEngryFrom(sourceId ? Game.getObjectById(sourceId) : creep.room.storage)
        },
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
                        return true
                    }
                    target = creep.pos.findClosestByRange(towers) as StructureTower
                }

                // 写入缓存
                creep.memory.fillStructureId = target.id
            }

            // 有的话就填充能量
            const transferResult = creep.transfer(target, RESOURCE_ENERGY)
            if (transferResult === ERR_NOT_IN_RANGE) creep.goTo(target.pos)
            else if (transferResult != OK) creep.say(`错误! ${transferResult}`)

            if (creep => creep.store[RESOURCE_ENERGY] === 0) return true
        }
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
                console.log(`[${creep.name}] nuker 填充任务，未找到 Storage 或者 Nuker`)
                return false
            }

            /**
             * 把多余的能量放终端里
             * @todo 这里应该有多余的能量就不拿这么多
             */
            if (creep.store[RESOURCE_ENERGY] > 0) {
                creep.transferTo(sourceStructure, RESOURCE_ENERGY)
                return false
            }

            // 获取应拿取的数量
            let getAmount = creep.getAmount(task.resourceType, sourceStructure, nuker)
            
            if (getAmount <= 0) {
                creep.room.deleteCurrentRoomTransferTask()
                console.log(`[${creep.name}] nuker 填充任务，资源不足`)
                return false
            }
            
            // 拿取资源
            const getResult = creep.withdraw(sourceStructure, task.resourceType, getAmount)
            if (getResult === OK) return true
            if (getResult === ERR_NOT_IN_RANGE) creep.goTo(sourceStructure.pos)
            else console.log(`[${creep.name}] nuker 填充任务，withdraw`, getResult)
        },
        target: (creep, task: IFillNuker) => {
            // 获取 nuker 及兜底
            let target: StructureNuker = Game.getObjectById(task.id)
            if (!target) {
                creep.room.deleteCurrentRoomTransferTask()
                return false
            }

            // 转移资源
            const transferResult = creep.transfer(target, task.resourceType)
            if (transferResult === ERR_NOT_IN_RANGE) creep.goTo(target.pos)
            else if (transferResult === OK) {
                creep.room.handleRoomTransferTask()
                // console.log(`[${creep.name}] 完成 nuker 填充任务`)
                return true
            }
            else creep.say(`错误! ${transferResult}`)
        }
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
                console.log(`[${creep.name}] labin, 未找到 terminal，任务已移除`)
                return false
            }

            // 把多余的能量放终端里
            if (creep.store[RESOURCE_ENERGY] > 0) {
                creep.transferTo(terminal, RESOURCE_ENERGY)
                return false
            }

            // 找到第一个需要的底物，然后从终端拿出
            const targetResource = task.resource.find(res => res.amount > 0)
            
            // 找不到了就说明都成功转移了
            if (!targetResource) {
                creep.room.deleteCurrentRoomTransferTask()
                return false
            }

            const getAmount = targetResource.amount > creep.store.getFreeCapacity() ?
                creep.store.getFreeCapacity() :
                targetResource.amount

            const actionResult = creep.withdraw(terminal, targetResource.type, getAmount)
            if (actionResult === OK) return true
            if (actionResult === ERR_NOT_IN_RANGE) creep.goTo(terminal.pos)
        },
        target: (creep, task: ILabIn) => {
            const targetResource = task.resource.find(res => res.amount > 0)
            // 找不到了就说明都成功转移了
            if (!targetResource) {
                creep.room.deleteCurrentRoomTransferTask()
                return true
            }
            
            const targetLab: StructureLab = Game.getObjectById(targetResource.id)

            // 转移资源
            const transferResult = creep.transfer(targetLab, targetResource.type)
            if (transferResult === ERR_NOT_IN_RANGE) creep.goTo(targetLab.pos)
            // 正常转移资源则更新任务
            else if (transferResult === OK) {
                // 这里直接更新到 0 的原因是因为这样可以最大化运载效率
                // 保证在产物移出的时候可以一次就拿完
                creep.room.handleLabInTask(targetResource.type, 0)
                return true
                // console.log(`[${creep.name}] 完成 labin 填充任务`)
            }
            else creep.say(`错误! ${transferResult}`)
        }
    },

    /**
     * lab 产物移出任务
     * 将 lab 的反应产物统一从 outLab 中移动到 terminal 中
     */
    [ROOM_TRANSFER_TASK.LAB_OUT]: {
        source: (creep, task: ILabOut) => {
            const labMemory = creep.room.memory.lab

            // 获取还有资源的 lab
            let targetLab = getNotClearLab(labMemory)

            // 还找不到或者目标里没有化合物了，说明已经搬空，执行 target
            if (!targetLab || !targetLab.mineralType) return true

            // 自己还拿着能量就先放到终端里
            if (!creep.room.terminal) {
                creep.room.deleteCurrentRoomTransferTask()
                console.log(`[${creep.name}] labout, 未找到 terminal，任务已移除`)
                return false
            }
            if (creep.store[RESOURCE_ENERGY] > 0) {
                creep.transferTo(creep.room.terminal, RESOURCE_ENERGY)
                return false
            }

            // 转移资源
            const withdrawResult = creep.withdraw(targetLab, targetLab.mineralType)

            if (withdrawResult === ERR_NOT_IN_RANGE) creep.goTo(targetLab.pos)
            // 正常转移资源则更新 memory 数量信息
            else if (withdrawResult === OK) {
                if (targetLab.id in labMemory.outLab) creep.room.memory.lab.outLab[targetLab.id] = targetLab.mineralType ? targetLab.store[targetLab.mineralType] : 0
                if (creep.store.getFreeCapacity() === 0) return true
            }
            // 满了也先去转移资源
            else if (withdrawResult === ERR_FULL) return true
            else creep.say(`draw ${withdrawResult}`)
        },
        target: (creep, task: ILabOut) => {
            const terminal = creep.room.terminal

            /**
             * @todo 没有 terminal 应该把资源转移到其他储藏里
             */
            if (!terminal) {
                creep.room.deleteCurrentRoomTransferTask()
                console.log(`[${creep.name}] labout, 未找到 terminal，任务已移除`)
                return false
            }

            // 指定资源类型及目标
            let resourceType = task.resourceType
            let target: StructureTerminal | StructureStorage = terminal

            // 如果是能量就优先放到 storage 里
            if (creep.store[RESOURCE_ENERGY] > 0) {
                resourceType = RESOURCE_ENERGY
                target = creep.room.storage || terminal
            }
            
            // 转移资源
            const transferResult = creep.transfer(target, resourceType)

            if (transferResult === OK || transferResult === ERR_NOT_ENOUGH_RESOURCES) {
                // 转移完之后就检查下还有没有没搬空的 lab，没有的话就完成任务
                if (getNotClearLab(creep.room.memory.lab) === undefined) creep.room.deleteCurrentRoomTransferTask()
                return true
            }
            if (transferResult === ERR_NOT_IN_RANGE) creep.goTo(terminal.pos)
            else creep.say(`labout ${transferResult}`)
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
            else sourceStructure = creep.room.terminal
            // 获取 powerspawn
            const powerspawn: StructurePowerSpawn = Game.getObjectById(task.id)

            // 兜底
            if (!sourceStructure || !powerspawn) {
                creep.room.deleteCurrentRoomTransferTask()
                console.log(`[${creep.name}] powerSpawn 填充任务，未找到 storage/terminal 或者 powerSpawn`)
                return false
            }

            // 如果身上有能量的话就直接去填充
            if (creep.store[task.resourceType] > 0) return true

            // 把多余的能量放终端里
            if (task.resourceType != RESOURCE_ENERGY && creep.store[RESOURCE_ENERGY] > 0) {
                creep.transferTo(sourceStructure, RESOURCE_ENERGY)
                return false
            }

            // 获取应拿取的数量
            let getAmount = creep.getAmount(task.resourceType, sourceStructure, powerspawn)
            
            if (getAmount <= 0) {
                creep.room.deleteCurrentRoomTransferTask()
                console.log(`[${creep.name}] powerSpawn 填充任务，${task.resourceType} 资源不足`)
                return false
            }
            
            // 拿取资源
            const getResult = creep.withdraw(sourceStructure, task.resourceType, getAmount)
            if (getResult === OK) return true
            if (getResult === ERR_NOT_IN_RANGE) creep.goTo(sourceStructure.pos)
            else console.log(`[${creep.name}] powerSpawn 填充任务，withdraw`, getResult)
        },
        target: (creep, task: IFillPowerSpawn) => {
            // 获取 powerSpawn 及兜底
            let target: StructurePowerSpawn = Game.getObjectById(task.id)
            if (!target) {
                creep.room.deleteCurrentRoomTransferTask()
                return true
            }

            // 转移资源
            const transferResult = creep.transfer(target, task.resourceType)
            if (transferResult === ERR_NOT_IN_RANGE) creep.goTo(target.pos)
            else if (transferResult === OK) {
                creep.room.handleRoomTransferTask()
                return true
            }
            else if (transferResult === ERR_NOT_ENOUGH_RESOURCES) return true
            else creep.say(`ps 填充错误 ${transferResult}`)
        }
    },
    
    /**
     * boost 资源移入任务
     * 在 boost 任务的 getResource 阶段发布
     * 将任务中给定的 lab 装载资源
     * 
     * @todo 一次搬运多种资源
     */
    [ROOM_TRANSFER_TASK.BOOST_GET_RESOURCE]: {
        source: (creep, task: IBoostGetResource) => {
            // 获取 terminal
            const terminal = creep.room.terminal
            if (!terminal) {
                creep.room.deleteCurrentRoomTransferTask()
                console.log(`[${creep.name}] boostGetResource, 未找到 terminal，任务已移除`)
                return false
            }

            // 把多余的能量放终端里
            if (creep.store[RESOURCE_ENERGY] > 0) {
                creep.transferTo(terminal, RESOURCE_ENERGY)
                return false
            }

            const boostConfig = creep.room.memory.boost

            // 从缓存中读取要拿取的资源
            let resource = creep.memory.taskResource
            // 没有缓存的话就找到第一个需要的强化材料，然后从终端拿出
            if (!resource) {
                resource = Object.keys(boostConfig.lab).find((res, index) => {
                    // 如果这个材料已经用完了就检查下一个
                    if (!terminal.store[res] || terminal.store[res] == 0) return false
                    const lab = Game.getObjectById<StructureLab>(boostConfig.lab[res])
                    // lab 里的资源不达标就进行运输
                    if (lab && lab.store[res] < boostResourceReloadLimit) return true
    
                    return false
                }) as ResourceConstant

                if (resource) creep.memory.taskResource = resource
                // 找不到了就说明都成功转移了
                else {
                    creep.room.deleteCurrentRoomTransferTask()
                    return false
                }
            }
        
            // 获取转移数量
            let getAmount = [ creep.store.getFreeCapacity(), terminal.store[resource]].reduce((x, y) => x > y ? y : x)

            // 拿出来
            const withdrawResult = creep.withdraw(terminal, resource as ResourceConstant, getAmount) 

            if (withdrawResult === OK || withdrawResult === ERR_FULL) return true
            if (withdrawResult == ERR_NOT_IN_RANGE) creep.goTo(terminal.pos)
            else creep.say(`boostIn ${withdrawResult}`)
        },
        target: (creep, task: IBoostGetResource) => {
            // 当前要转移的资源在 task.resource 中的索引值
            let targetIndex: number
            // 找到要转移的资源以及目标 lab
            const targetResource = creep.memory.taskResource
            const targetLab: StructureLab = Game.getObjectById(creep.room.memory.boost.lab[targetResource])

            // 转移资源
            const transferResult = creep.transfer(targetLab, targetResource)
            if (transferResult === ERR_NOT_IN_RANGE) creep.goTo(targetLab.pos)
            // 正常转移资源则更新任务
            else if (transferResult === OK) {
                // 移除缓存，在 source 阶段重新查找
                delete creep.memory.taskResource
                return true
            }
            // resource 有问题的话就再返回 source 阶段处理
            else if (transferResult === ERR_INVALID_ARGS) return true
            else creep.say(`boostTarget 错误! ${transferResult}`)
        }
    },

    /**
     * lab 能量填充任务
     * 在 boost 阶段发布
     * 将给指定的 lab 填满能量
     */
    [ROOM_TRANSFER_TASK.BOOST_GET_ENERGY]: {
        source: (creep, task, sourceId) => {
            if (creep.store[RESOURCE_ENERGY] > 0) return true
            creep.getEngryFrom(sourceId ? Game.getObjectById(sourceId) : creep.room.storage)
        },
        target: creep => {
            const boostLabs = Object.values(creep.room.memory.boost.lab)
            
            // 获取能量为空的 lab
            let targetLab: StructureLab
            for (const labId of boostLabs) {
                const lab: StructureLab = Game.getObjectById(labId)
                if (lab && lab.store[RESOURCE_ENERGY] != LAB_ENERGY_CAPACITY) {
                    targetLab = lab
                    break
                }
            }

            // 找不到就说明任务完成
            if (!targetLab) {
                creep.room.deleteCurrentRoomTransferTask()
                return true
            }

            // 转移资源
            const transferResult = creep.transfer(targetLab, RESOURCE_ENERGY)
            if (transferResult === OK) return true
            if (transferResult === ERR_NOT_IN_RANGE) creep.goTo(targetLab.pos)
            // 正常转移资源则更新任务
            else creep.say(`强化能量 ${transferResult}`)
        }
    },

    /**
     * boost 材料清理任务
     * 将 boost 强化没用完的材料再搬回 terminal
     */
    [ROOM_TRANSFER_TASK.BOOST_CLEAR]: {
        source: (creep, task: IBoostClear) => {
            const boostLabs = Object.values(creep.room.memory.boost.lab)
            
            // 获取能量为空的 lab
            let targetLab: StructureLab
            for (const labId of boostLabs) {
                const lab: StructureLab = Game.getObjectById(labId)
                if (lab && lab.mineralType) {
                    targetLab = lab
                    break
                }
            }

            // 找不到就说明任务完成
            if (!targetLab) {
                creep.room.deleteCurrentRoomTransferTask()
                return false
            }

            // 自己还拿着能量就先放到终端里
            if (!creep.room.terminal) {
                creep.room.deleteCurrentRoomTransferTask()
                console.log(`[${creep.name}] boostClear, 未找到 terminal，任务已移除`)
                return false
            }
            if (creep.store[RESOURCE_ENERGY] > 0) {
                creep.transferTo(creep.room.terminal, RESOURCE_ENERGY)
                return false
            }
            

            // 转移资源
            const withdrawResult = creep.withdraw(targetLab, targetLab.mineralType)
            if (withdrawResult === OK) return true
            if (withdrawResult === ERR_NOT_IN_RANGE) creep.goTo(targetLab.pos)
            // 正常转移资源则更新任务
            else creep.say(`强化清理 ${withdrawResult}`)
        },
        target: (creep, task: IBoostClear) => {
            const terminal = creep.room.terminal

            /**
             * @todo 没有 terminal 应该把资源转移到其他储藏里
             */
            if (!terminal) {
                creep.room.deleteCurrentRoomTransferTask()
                console.log(`[${creep.name}] boostClear, 未找到 terminal，任务已移除`)
                return true
            }
            
            // 转移资源
            // 这里直接使用了 [0] 的原因是如果 store 里没有资源的话 creep 就会去执行 source 阶段，并不会触发这段代码
            const transferResult = creep.transfer(terminal, <ResourceConstant>Object.keys(creep.store)[0])
            if (transferResult === OK) return true
            if (transferResult === ERR_NOT_IN_RANGE) creep.goTo(terminal.pos)
            // 正常转移资源则更新任务
            else creep.say(`强化清理 ${transferResult}`)
        }
    },
}

/**
 * 获取还没有清空的 lab
 * 
 * @param labMemory 房间中的 lab 集群内存
 */
function getNotClearLab(labMemory: any): StructureLab {
    for (const outLabId in labMemory.outLab) {
        if (labMemory.outLab[outLabId] > 0){
            return Game.getObjectById(outLabId)
        }
    }

    // 找不到的话就检查下 inLab 是否净空
    for (const labId of labMemory.inLab) {
        // 获取 inLab
        const inLab = Game.getObjectById(labId) as StructureLab
        // transfer 并非 lab 集群内部成员，所以不会对 inLab 的缺失做出响应
        if (!inLab) continue

        // 如果有剩余资源的话就拿出来
        if (inLab.mineralType) return inLab
    }

    return undefined
}