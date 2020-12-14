import { boostResourceReloadLimit, ROOM_TRANSFER_TASK } from 'setting'

/**
 * manager 在应对不同类型的任务时执行的操作
 * 该对象的属性名即为任务类型
 */
export const transferTaskOperations: { [taskType: string]: transferTaskOperation } = {
    /**
     * extension 填充任务
     * 维持正常孵化的任务
     */
    [ROOM_TRANSFER_TASK.FILL_EXTENSION]: {
        source: (creep, task, sourceId) => {
            if (creep.store[RESOURCE_ENERGY] > 0) return true
            const result = creep.getEngryFrom(sourceId ? Game.getObjectById(sourceId) : creep.room.storage)
            return result === OK
        },
        target: creep => {
            if (creep.store[RESOURCE_ENERGY] === 0) return true
            let target: StructureExtension | StructureSpawn

            // 有缓存就用缓存
            if (creep.memory.fillStructureId) {
                target = Game.getObjectById(creep.memory.fillStructureId as Id<StructureExtension>)

                // 如果找不到对应的建筑或者已经填满了就移除缓存
                if (!target || target.structureType !== STRUCTURE_EXTENSION || target.store.getFreeCapacity(RESOURCE_ENERGY) <= 0) {
                    delete creep.memory.fillStructureId
                    target = undefined
                }
            }

            // 没缓存就重新获取
            if (!target) {
                // 找到能量没填满的 extension 或者 spawn
                const needFillStructure = [...creep.room[STRUCTURE_EXTENSION], ...creep.room[STRUCTURE_SPAWN]].filter(s => {
                    return s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                })
                // 获取有需求的建筑
                target = creep.pos.findClosestByRange(needFillStructure)

                if (!target) {
                    // 都填满了，任务完成
                    creep.room.deleteCurrentRoomTransferTask()
                    return true
                }

                // 写入缓存
                creep.memory.fillStructureId = target.id
            }

            // 有的话就填充能量
            const result = creep.transferTo(target, RESOURCE_ENERGY)
            if (result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_FULL) return true
            else if (result != OK && result != ERR_NOT_IN_RANGE) creep.say(`拓展填充 ${result}`)
        }
    },

    /**
     * tower 填充任务
     * 维持房间内所有 tower 的能量
     */
    [ROOM_TRANSFER_TASK.FILL_TOWER]: {
        source: (creep, task, sourceId) => {
            if (creep.store[RESOURCE_ENERGY] > 0) return true
            const result = creep.getEngryFrom(sourceId ? Game.getObjectById(sourceId) : creep.room.storage)
            return result === OK
        },
        target: (creep, task: IFillTower) => {
            if (creep.store[RESOURCE_ENERGY] === 0) return true
            let target: StructureTower

            // 有缓存的话
            if (creep.memory.fillStructureId) {
                target = Game.getObjectById(creep.memory.fillStructureId as Id<StructureTower>)
                
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
                    const towers = creep.room[STRUCTURE_TOWER].filter(tower => tower.store[RESOURCE_ENERGY] <= 900)

                    // 如果还没找到的话就算完成任务了
                    if (towers.length <= 0) {
                        creep.room.deleteCurrentRoomTransferTask()
                        return true
                    }
                    target = creep.pos.findClosestByRange(towers) as StructureTower
                }

                // 写入缓存
                creep.memory.fillStructureId = target.id
            }

            // 有的话就填充能量
            const result = creep.transferTo(target, RESOURCE_ENERGY)
            if (result != OK && result != ERR_NOT_IN_RANGE) creep.say(`塔填充 ${result}`)
        }
    },

    /**
     * nuker 填充任务
     * 由 nuker 在 Nuker.work 中发布
     * 任务的搬运量取决于 manager 的最大存储量，搬一次就算任务完成
     */
    [ROOM_TRANSFER_TASK.FILL_NUKER]: {
        source: (creep, task: IFillNuker, sourceId) => {
            // 如果身上有对应资源的话就直接去填充
            if (creep.store[task.resourceType] > 0) return true

            // 获取资源存储建筑
            let sourceStructure: StructureStorage | StructureTerminal
            if (task.resourceType == RESOURCE_ENERGY) sourceStructure = creep.room.storage
            else sourceStructure = creep.room.terminal
            // 获取 nuker
            const nuker = Game.getObjectById(task.id)

            // 兜底
            if (!sourceStructure || !nuker) {
                creep.room.deleteCurrentRoomTransferTask()
                creep.log(`nuker 填充任务，未找到 Storage 或者 Nuker`)
                return false
            }

            if (!clearCarryingEnergy(creep)) return false

            // 获取应拿取的数量（能拿取的最小值）
            let getAmount = Math.min(
                creep.store.getFreeCapacity(task.resourceType),
                sourceStructure.store[task.resourceType],
                nuker.store.getFreeCapacity(task.resourceType)
            )

            if (getAmount <= 0) {
                creep.room.deleteCurrentRoomTransferTask()
                creep.log(`nuker 填充任务，资源不足`)
                return false
            }
            
            // 拿取资源
            creep.goTo(sourceStructure.pos)
            const result = creep.withdraw(sourceStructure, task.resourceType, getAmount)
            if (result === OK) return true
            else if (result != ERR_NOT_IN_RANGE) creep.log(`nuker 填充任务，withdraw ${result}`, 'red')
        },
        target: (creep, task: IFillNuker) => {
            // 获取 nuker 及兜底
            let target = Game.getObjectById(task.id)
            if (!target) {
                creep.room.deleteCurrentRoomTransferTask()
                return false
            }

            // 转移资源
            const result = creep.transferTo(target, task.resourceType)
            if (result === OK) {
                creep.room.deleteCurrentRoomTransferTask()
                return true
            }
            else if (result != ERR_NOT_IN_RANGE) creep.say(`核弹填充 ${result}`)
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
                creep.log(`labin, 未找到 terminal，任务已移除`)
                return false
            }

            if (!clearCarryingEnergy(creep)) return false

            // 找到第一个需要从终端取出的底物
            const targetResource = task.resource.find(res => res.amount > 0)

            // 找不到了就说明都成功转移了
            if (!targetResource) {
                creep.room.deleteCurrentRoomTransferTask()
                return false
            }

            // 获取能拿取的数量
            const getAmount = Math.min(targetResource.amount, creep.store.getFreeCapacity())

            creep.goTo(terminal.pos)
            const result = creep.withdraw(terminal, targetResource.type, getAmount)
            if (result === OK) return true
            else if (result === ERR_NOT_ENOUGH_RESOURCES) {
                creep.room.deleteCurrentRoomTransferTask()
            }
            else if (result != ERR_NOT_IN_RANGE) creep.say(`labInA ${result}`)
        },
        target: (creep, task: ILabIn) => {
            const targetResource = task.resource.find(res => res.amount > 0)
            // 找不到了就说明都成功转移了
            if (!targetResource) {
                creep.room.deleteCurrentRoomTransferTask()
                return true
            }

            const targetLab = Game.getObjectById(targetResource.id)

            // 转移资源
            const result = creep.transferTo(targetLab, targetResource.type)
            // 正常转移资源则更新任务
            if (result === OK) {
                // 这里直接更新到 0 的原因是因为这样可以最大化运载效率
                // 保证在产物移出的时候可以一次就拿完
                creep.room.handleLabInTask(targetResource.type, 0)
                return true
            }
            else if (result != ERR_NOT_IN_RANGE) creep.say(`labInB ${result}`)
        }
    },

    /**
     * lab 产物移出任务
     * 把 lab 中所有的资源都转移到 terminal 中
     */
    [ROOM_TRANSFER_TASK.LAB_OUT]: {
        source: (creep, task: ILabOut) => {
            // 获取还有资源的 lab（mineralType 有值就代表其中还有资源）
            let targetLab = creep.room[STRUCTURE_LAB].find(lab => lab.mineralType)

            // 还找不到或者目标里没有化合物了，说明已经搬空，执行 target
            if (!targetLab || !targetLab.mineralType) return true

            if (!clearCarryingEnergy(creep)) return false

            // 转移资源
            creep.goTo(targetLab.pos)
            const result = creep.withdraw(targetLab, targetLab.mineralType)

            // 拿到资源了就看下有没有拿满，满了就开始往回运
            if (result === OK) {
                if (creep.store.getFreeCapacity() === 0) return true
            }
            // 满了也先去转移资源
            else if (result === ERR_FULL) return true
            else if (result != ERR_NOT_IN_RANGE) creep.say(`draw ${result}`)
        },
        target: (creep, task: ILabOut) => {
            const terminal = creep.room.terminal

            if (!terminal) {
                creep.room.deleteCurrentRoomTransferTask()
                creep.log(`labout, 未找到 terminal，任务已移除`)
                return false
            }

            // 指定资源类型及目标
            // 因为在 source 阶段已经清空身上的能量了，所以这里不会是能量
            const resourceType = Object.keys(creep.store)[0] as ResourceConstant
            // 没值了就说明自己身上已经空了，检查下还有没有没搬空的 lab，没有的话就完成任务
            if (!resourceType) {
                if (creep.room[STRUCTURE_LAB].find(lab => lab.mineralType) === undefined) {
                    creep.room.deleteCurrentRoomTransferTask()
                }
                return true
            }

            // 转移资源
            const result = creep.transferTo(terminal, resourceType)

            if (result != ERR_NOT_IN_RANGE && result != OK) creep.say(`labout ${result}`)
        }
    },

    /**
     * powerspawn 填充任务
     * 由 powerSpawn 在 powerSpawn.work 中发布
     * 任务的搬运量取决于 manager 的最大存储量，搬一次就算任务完成
     */
    [ROOM_TRANSFER_TASK.FILL_POWERSPAWN]: {
        source: (creep, task: IFillPowerSpawn, sourceId: Id<StructureStorage | StructureTerminal>) => {
            // 如果身上有对应资源的话就直接去填充
            if (creep.store[task.resourceType] > 0) return true

            // 获取资源存储建筑
            let sourceStructure: StructureStorage | StructureTerminal
            if (task.resourceType == RESOURCE_ENERGY) sourceStructure = sourceId ? Game.getObjectById(sourceId) : creep.room.storage
            else sourceStructure = creep.room.terminal
            // 获取 powerspawn
            const powerspawn = Game.getObjectById(task.id)

            // 兜底
            if (!sourceStructure || !powerspawn) {
                creep.room.deleteCurrentRoomTransferTask()
                creep.log(`powerSpawn 填充任务，未找到 storage/terminal 或者 powerSpawn`)
                return false
            }

            if (!clearCarryingEnergy(creep)) return false

            // 获取应拿取的数量
            let getAmount = Math.min(
                creep.store.getFreeCapacity(task.resourceType),
                sourceStructure.store[task.resourceType],
                powerspawn.store.getFreeCapacity(task.resourceType)
            )

            if (getAmount <= 0) {
                creep.room.deleteCurrentRoomTransferTask()
                creep.log(`powerSpawn 填充任务，${task.resourceType} 资源不足`)
                return false
            }

            // 拿取资源
            creep.goTo(sourceStructure.pos)
            const result = creep.withdraw(sourceStructure, task.resourceType, getAmount)
            if (result === OK) return true
            else if (result != ERR_NOT_IN_RANGE) creep.log(`powerSpawn 填充任务，withdraw ${result}`, 'red')
        },
        target: (creep, task: IFillPowerSpawn) => {
            // 获取 powerSpawn 及兜底
            let target = Game.getObjectById(task.id)
            if (!target) {
                creep.room.deleteCurrentRoomTransferTask()
                return true
            }

            // 转移资源
            const result = creep.transferTo(target, task.resourceType)

            if (result === OK) {
                creep.room.deleteCurrentRoomTransferTask()
                return true
            }
            else if (result === ERR_NOT_ENOUGH_RESOURCES) return true
            else if (result != ERR_NOT_IN_RANGE) creep.say(`ps 填充错误 ${result}`)
        }
    },

    /**
     * boost 资源移入任务
     * 在 boost 任务的 getResource 阶段发布
     * 将任务中给定的 lab 装载资源
     */
    [ROOM_TRANSFER_TASK.BOOST_GET_RESOURCE]: {
        source: (creep, task: IBoostGetResource) => {
            // 获取 terminal
            const terminal = creep.room.terminal
            if (!terminal) {
                creep.room.deleteCurrentRoomTransferTask()
                creep.log(`boostGetResource, 未找到 terminal，任务已移除`)
                return false
            }

            if (!clearCarryingEnergy(creep)) return false

            const boostConfig = creep.room.memory.boost

            // 从缓存中读取要拿取的资源
            let resource = creep.memory.taskResource
            // 没有缓存的话就找到第一个需要的强化材料，然后从终端拿出
            if (!resource) {
                resource = Object.keys(boostConfig.lab).find((res, index) => {
                    // 如果这个材料已经用完了就检查下一个
                    if (!terminal.store[res] || terminal.store[res] == 0) return false
                    const lab = Game.getObjectById(boostConfig.lab[res])
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
            let getAmount = Math.min(creep.store.getFreeCapacity(resource), terminal.store[resource])

            // 拿出来
            creep.goTo(terminal.pos)
            const result = creep.withdraw(terminal, resource as ResourceConstant, getAmount) 

            if (result === OK || result === ERR_FULL) return true
            else if (result != ERR_NOT_IN_RANGE) creep.say(`boostIn ${result}`)
        },
        target: (creep, task: IBoostGetResource) => {
            // 找到要转移的资源以及目标 lab
            const targetResource = creep.memory.taskResource
            const targetLab = Game.getObjectById(creep.room.memory.boost.lab[targetResource])

            // 转移资源
            creep.goTo(targetLab.pos)
            const result = creep.transfer(targetLab, targetResource)
            // 正常转移资源则更新任务
            if (result === OK) {
                // 移除缓存，在 source 阶段重新查找
                delete creep.memory.taskResource
                return true
            }
            // resource 有问题的话就再返回 source 阶段处理
            else if (result === ERR_INVALID_ARGS) return true
            else if (result != ERR_NOT_IN_RANGE) creep.say(`boostTarget 错误! ${result}`)
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
                const lab = Game.getObjectById(labId)
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
            creep.goTo(targetLab.pos)
            const result = creep.transfer(targetLab, RESOURCE_ENERGY)
            if (result === OK) return true
            // 正常转移资源则更新任务
            else if (result != ERR_NOT_IN_RANGE) creep.say(`强化能量 ${result}`)
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
                const lab = Game.getObjectById(labId)
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

            if (!clearCarryingEnergy(creep)) return false

            // 转移资源
            creep.goTo(targetLab.pos)
            const result = creep.withdraw(targetLab, targetLab.mineralType)
            if (result === OK) return true
            // 正常转移资源则更新任务
            else if (result != ERR_NOT_IN_RANGE) creep.say(`强化清理 ${result}`)
        },
        target: (creep, task: IBoostClear) => {
            const terminal = creep.room.terminal

            if (!terminal) {
                creep.room.deleteCurrentRoomTransferTask()
                creep.log(`boostClear, 未找到 terminal，任务已移除`)
                return true
            }
            
            // 转移资源
            // 这里直接使用了 [0] 的原因是如果 store 里没有资源的话 creep 就会去执行 source 阶段，并不会触发这段代码
            const result = creep.transferTo(terminal, <ResourceConstant>Object.keys(creep.store)[0])
            if (result === OK) return true
            // 正常转移资源则更新任务
            else if (result != ERR_NOT_IN_RANGE) creep.say(`强化清理 ${result}`)
        }
    }
}

/**
 * 获取指定房间的物流任务
 * 
 * @param room 要获取物流任务的房间名
 */
export const getRoomTransferTask = function(room: Room): RoomTransferTasks | null {
    const task = room.getRoomTransferTask()
    if (!task) return null

    // 如果任务类型不对就移除任务并报错退出
    if (!transferTaskOperations.hasOwnProperty(task.type)) {
        room.deleteCurrentRoomTransferTask()
        room.log(`发现未定义的房间物流任务 ${task.type}, 已移除`, 'manager', 'yellow')
        return null
    }

    return task
}

/**
 * 处理掉 creep 身上携带的能量
 * 运输者在之前处理任务的时候身上可能会残留能量，如果不及时处理的话可能会导致任务处理能力下降
 * 
 * @param creep 要净空的 creep
 * @returns 为 true 时代表已经处理完成，可以继续执行任务
 */
const clearCarryingEnergy = function (creep: Creep): boolean {
    if (creep.store[RESOURCE_ENERGY] > 0) {
        // 能放下就放，放不下说明能量太多了，直接扔掉
        if (creep.room.storage && creep.room.storage.store.getFreeCapacity() >= creep.store[RESOURCE_ENERGY]) creep.transferTo(creep.room.storage, RESOURCE_ENERGY)
        else creep.drop(RESOURCE_ENERGY)

        return false
    }

    return true
}