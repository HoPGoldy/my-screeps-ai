import { Color } from '@/modulesGlobal'
import { getRoomEnergyTarget, findStrategy } from '@/modulesGlobal/energyUtils'
import { CreepRole, RoleCreep } from '@/role/types/role'
import { useCache } from '@/utils'
import RoomTransport, { TransportActionGenerator } from './controller'
import { TransportTaskType } from './types'

/**
 * 没有任务时的行为逻辑
 */
export const noTask = creep => ({
    source: () => {
        creep.say('💤')
        return false
    },
    target: () => true
})

/**
 * 搬运工在执行各种类型的物流任务时的对应逻辑
 */
export const transportActions: {
    [TaskType in TransportTaskType]: TransportActionGenerator<TaskType>
} = {
    /**
     * 基础搬运任务
     * 从一个地方（建筑）搬运东西到另一个地方（建筑）
     */
    [TransportTaskType.Transport]: (creep, task, transport) => ({
        source: () => {
            if (creep.store[task.resourceType] > 0) return true
            if (!clearCarrying(creep, getUnenergyResource(creep))) return false

            // 是 id，从建筑获取
            if (typeof task.from === 'string') {
                // 获取目标建筑
                const targetStructure = Game.getObjectById(task.from)
                if (!targetStructure) transport.removeTask(task.key)

                // 检查下有没有资源
                const resAmount = targetStructure.store[task.resourceType] || 0
                // 剩余资源小于任务结束条件了，结束任务
                if (resAmount <= (task.endWith || 0)) {
                    transport.removeTask(task.key)
                    transport.countWorkTime()
                    return false
                }

                // 移动到目的地，获取资源
                creep.goTo(targetStructure.pos, { range: 1 })
                transport.countWorkTime()
                const result = creep.withdraw(targetStructure, task.resourceType)
                return result === OK
            }
            // 是位置，尝试捡一下
            else {
                // 获取目标位置
                const [ x, y, roomName ] = task.from as [number, number, string]
                const targetPos = new RoomPosition(x, y, roomName)

                // 检查下有没有资源
                const targetRes = targetPos.lookFor(LOOK_RESOURCES).find(res => res.resourceType === task.resourceType)
                // 资源没了或者到达结束条件
                if (!targetRes || targetRes.amount <= (task.endWith || 0)) {
                    transport.removeTask(task.key)
                    transport.countWorkTime()
                    return false
                }

                // 移动到目的地，捡起资源
                creep.goTo(targetPos, { range: 1 })
                transport.countWorkTime()
                const result = creep.pickup(targetRes)
                return result === OK
            }
        },
        target: () => {
            transport.countWorkTime()
            if (creep.store[task.resourceType] <= 0) return true

            // 是 id，存放到只当建筑
            if (typeof task.to === 'string') {
                // 获取目标建筑
                const targetStructure = Game.getObjectById(task.to)
                if (!targetStructure) transport.removeTask(task.key)

                // 移动到目的地，获取资源
                creep.goTo(targetStructure.pos, { range: 1 })
                const result = creep.transfer(targetStructure, task.resourceType)
                return result === OK
            }
            // 是位置，走到地方然后扔下去
            else {
                // 获取目标位置
                const [ x, y, roomName ] = task.to as [number, number, string]
                const targetPos = new RoomPosition(x, y, roomName)

                // 移动到目的地，捡起资源
                creep.goTo(targetPos, { range: 1 })
                const result = creep.drop(task.resourceType)
                return result === OK
            }
        }
    }),

    /**
     * extension 填充任务
     * 维持正常孵化的任务
     */
    [TransportTaskType.FillExtension]: (creep, task, transport) => ({
        source: () => getEnergy(creep, transport),
        target: () => {
            transport.countWorkTime()
            if (creep.store[RESOURCE_ENERGY] === 0) return creep.backToGetEnergy()

            const result = fillSpawnStructure(creep)

            if (result === ERR_NOT_FOUND) {
                transport.removeTask(task.key)
                return creep.backToGetEnergy()
            }
            else if (result === ERR_NOT_ENOUGH_ENERGY) return creep.backToGetEnergy()
        }
    }),

    /**
     * tower 填充任务
     * 维持房间内所有 tower 的能量
     */
    [TransportTaskType.FillTower]: (creep, task, transport) => ({
        source: () => getEnergy(creep, transport),
        target: () => {
            transport.countWorkTime()
            if (creep.store[RESOURCE_ENERGY] === 0) return creep.backToGetEnergy()
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
                        transport.removeTask(task.key)
                        return creep.backToGetEnergy()
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
    }),

    /**
     * nuker 填充任务
     * 由 nuker 在 Nuker.work 中发布
     * 任务的搬运量取决于 manager 的最大存储量，搬一次就算任务完成
     */
    [TransportTaskType.FillNuker]: (creep, task, transport) => ({
        source: () => {
            transport.countWorkTime()
            // 如果身上有对应资源的话就直接去填充
            if (creep.store[task.resourceType] > 0) return true

            // 获取资源存储建筑
            const sourceStructure = creep.room.myStorage.getResourcePlace(task.resourceType)
            // 获取 nuker
            const nuker = Game.getObjectById(task.id)

            // 兜底
            if (!sourceStructure || !nuker) {
                transport.removeTask(task.key)
                creep.log(`nuker 填充任务，未找到 Storage/terminal 或者 Nuker`)
                return false
            }

            if (!clearCarrying(creep, RESOURCE_ENERGY)) return false

            // 获取应拿取的数量（能拿取的最小值）
            const getAmount = Math.min(
                creep.store.getFreeCapacity(task.resourceType),
                sourceStructure.store[task.resourceType],
                nuker.store.getFreeCapacity(task.resourceType)
            )

            if (getAmount <= 0) {
                transport.removeTask(task.key)
                creep.log(`nuker 填充任务，资源不足`)
                return false
            }
            
            // 拿取资源
            creep.goTo(sourceStructure.pos)
            const result = creep.withdraw(sourceStructure, task.resourceType, getAmount)
            if (result === OK) return true
            else if (result != ERR_NOT_IN_RANGE) creep.log(`nuker 填充任务，withdraw ${result}`, Color.Red)
        },
        target: () => {
            transport.countWorkTime()
            // 获取 nuker 及兜底
            let target = Game.getObjectById(task.id)
            if (!target) {
                transport.removeTask(task.key)
                return false
            }

            // 转移资源
            const result = creep.transferTo(target, task.resourceType)
            if (result === OK) {
                transport.removeTask(task.key)
                return true
            }
            else if (result != ERR_NOT_IN_RANGE) creep.say(`核弹填充 ${result}`)
        }
    }),

    /**
     * lab 资源移入任务
     * 在 lab 集群的 getResource 阶段发布
     * 在 inLab 中填充两种底物
     */
    [TransportTaskType.LabIn]: (creep, task, transport) => ({
        source: () => {
            transport.countWorkTime()
            if (!clearCarrying(creep, RESOURCE_ENERGY)) return false

            // 找到第一个需要转移的底物
            const moveResource = task.resource.find(({ amount, transporterName, type, id }) => {
                // 不会动被别的单位负责的资源
                if (transporterName && Game.creeps[transporterName] && transporterName !== creep.name) return false
                const targetLab = Game.getObjectById(id)

                // lab 里没装满
                return targetLab && targetLab.store[type] < amount &&
                    // 自己身上带的不够
                    creep.store[type] < amount &&
                    // 仓库里还有存货，就决定搬这个了！
                    creep.room.myStorage.getResourcePlace(type)
            })

            // 找不到了就说明都已经取到身上了、或者别的爬在运
            if (!moveResource) return true

            const { type: resType, id: labId, amount: expectAmount } = moveResource

            moveResource.transporterName = creep.name
            const storeStructure = creep.room.myStorage.getResourcePlace(resType)

            creep.goTo(storeStructure.pos)
            const withdrawAmount = Math.min(
                expectAmount - Game.getObjectById(labId).store[resType],
                creep.store.getFreeCapacity(resType),
                storeStructure.store[resType]
            )

            const result = creep.withdraw(storeStructure, resType, withdrawAmount)

            // 拿到资源了就看下有没有拿满，满了就开始往回运
            if (result === OK) {
                // 此时 withdraw 还没有执行，所以需要手动减去对应的搬运量
                if (creep.store.getFreeCapacity() - withdrawAmount <= 0) return true
            }
            // 拿不下了就运过去
            else if (result === ERR_FULL) return true
            else if (result === ERR_NOT_ENOUGH_RESOURCES) {
                transport.removeTask(task.key)
                creep.log(`执行 labIn 任务时出现资源不足问题： ${JSON.stringify(moveResource)}`)
            }
            else if (result != ERR_NOT_IN_RANGE) creep.say(`labInA ${result}`)
        },
        target: () => {
            transport.countWorkTime()
            if (creep.store.getCapacity() <= 0) return true

            const targetResource = task.resource.find(res => {
                return creep.store[res.type] > 0 && Game.getObjectById(res.id)
            })

            // 找不到了就说明身上搬空了
            if (!targetResource) {
                const needTranserRes = task.resource.find(({ id, type, amount }) => {
                    const targetLab = Game.getObjectById(id)
                    return targetLab && targetLab.store[type] < amount
                })
                // 如果这时候任务里的所有资源待搬运量都是0的话说明任务完成
                if (!needTranserRes) transport.removeTask(task.key)
                return true
            }

            const targetLab = Game.getObjectById(targetResource.id)

            // 转移资源
            const result = creep.transferTo(targetLab, targetResource.type)
            // 正常转移资源
            if (result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_FULL) return true
            else if (result != OK && result != ERR_NOT_IN_RANGE) creep.say(`labInB ${result}`)
        }
    }),

    /**
     * lab 资源移出任务
     * 把 lab 中所有的资源都转移到 terminal 中
     */
    [TransportTaskType.LabOut]: (creep, task, transport) => ({
        source: () => {
            transport.countWorkTime()
            if (!clearCarrying(creep, RESOURCE_ENERGY)) return false

            // 获取还有资源的 lab（mineralType 有值就代表其中还有资源）
            const targetLabId = task.labId.find(labId => {
                const lab = Game.getObjectById(labId)
                return lab && lab.mineralType
            })
            const targetLab = Game.getObjectById(targetLabId)

            // 还找不到或者目标里没有化合物了，说明已经搬空，执行 target
            if (!targetLab || !targetLab.mineralType) return true

            // 转移资源
            creep.goTo(targetLab.pos)
            const withdrawAmount = Math.min(targetLab.store[targetLab.mineralType], creep.store.getFreeCapacity())
            const result = creep.withdraw(targetLab, targetLab.mineralType, withdrawAmount)

            // 拿到资源了就看下有没有拿满，满了就开始往回运
            if (result === OK) {
                // 此时 withdraw 还没有执行，所以需要手动减去对应的搬运量
                if (creep.store.getFreeCapacity() - withdrawAmount === 0) return true
            }
            // 拿不下了就往回运
            else if (result === ERR_FULL) return true
            else if (result != ERR_NOT_IN_RANGE) creep.say(`draw ${result}`)
        },
        target: () => {
            transport.countWorkTime()
            const targetStructure = creep.room.terminal || creep.room.storage

            if (!targetStructure) {
                transport.removeTask(task.key)
                creep.log(`labout 未找到 terminal/storage，任务已移除`)
                return false
            }

            // 指定资源类型及目标
            // 因为在 source 阶段已经清空身上的能量了，所以这里不会是能量
            const resourceType = Object.keys(creep.store)[0] as ResourceConstant
            // 没值了就说明自己身上已经空了，检查下还有没有没搬空的 lab，没有的话就完成任务
            if (!resourceType) {
                const hasLabNotClear = task.labId.find(labId => {
                    const lab = Game.getObjectById(labId)
                    return lab && lab.mineralType
                })

                if (!hasLabNotClear) transport.removeTask(task.key)
                return true
            }

            // 转移资源
            const result = creep.transferTo(targetStructure, resourceType)

            if (result != ERR_NOT_IN_RANGE && result != OK) creep.say(`labout ${result}`)
        }
    }),

    /**
     * powerspawn 填充任务
     * 由 powerSpawn 在 powerSpawn.work 中发布
     * 任务的搬运量取决于 manager 的最大存储量，搬一次就算任务完成
     */
    [TransportTaskType.FillPowerSpawn]: (creep, task, transport) => ({
        source: () => {
            transport.countWorkTime()
            // 如果身上有对应资源的话就直接去填充
            if (creep.store[task.resourceType] > 0) return true

            // 获取资源存储建筑
            const sourceStructure = creep.room.myStorage.getResourcePlace(task.resourceType)
            // 获取 powerspawn
            const powerspawn = Game.getObjectById(task.id)

            // 兜底
            if (!sourceStructure || !powerspawn) {
                transport.removeTask(task.key)
                creep.log(`powerSpawn 填充任务，未找到 storage/terminal 或者 powerSpawn`)
                return false
            }

            if (!clearCarrying(creep, RESOURCE_ENERGY)) return false

            // 获取应拿取的数量
            let getAmount = Math.min(
                creep.store.getFreeCapacity(task.resourceType),
                sourceStructure.store[task.resourceType],
                powerspawn.store.getFreeCapacity(task.resourceType)
            )

            if (getAmount <= 0) {
                transport.removeTask(task.key)
                creep.log(`powerSpawn 填充任务，${task.resourceType} 资源不足`)
                return false
            }

            // 拿取资源
            creep.goTo(sourceStructure.pos)
            const result = creep.withdraw(sourceStructure, task.resourceType, getAmount)
            if (result === OK) return true
            else if (result != ERR_NOT_IN_RANGE) creep.log(`powerSpawn 填充任务，withdraw ${result}`, Color.Red)
        },
        target: () => {
            transport.countWorkTime()
            // 获取 powerSpawn 及兜底
            let target = Game.getObjectById(task.id)
            if (!target) {
                transport.removeTask(task.key)
                return true
            }

            // 转移资源
            const result = creep.transferTo(target, task.resourceType)

            if (result === OK) {
                transport.removeTask(task.key)
                return true
            }
            else if (result === ERR_NOT_ENOUGH_RESOURCES) return true
            else if (result != ERR_NOT_IN_RANGE) creep.say(`ps 填充错误 ${result}`)
        }
    }),

    /**
     * lab 能量填充任务
     * 在 boost 阶段发布
     * 将给指定的 lab 填满能量
     */
    [TransportTaskType.LabGetEnergy]: (creep, task, transport) => ({
        source: () => getEnergy(creep, transport),
        target: () => {
            transport.countWorkTime()
            const boostLabs = creep.room.myLab.boostLabs

            // 获取能量为空的 lab
            let targetLab: StructureLab
            for (const lab of boostLabs) {
                if (lab && lab.store[RESOURCE_ENERGY] != LAB_ENERGY_CAPACITY) {
                    targetLab = lab
                    break
                }
            }

            // 找不到就说明任务完成
            if (!targetLab) {
                transport.removeTask(task.key)
                return true
            }

            // 转移资源
            creep.goTo(targetLab.pos)
            const result = creep.transfer(targetLab, RESOURCE_ENERGY)
            if (result === OK || result === ERR_NOT_ENOUGH_RESOURCES) return true
            // 正常转移资源则更新任务
            else if (result != ERR_NOT_IN_RANGE) creep.say(`强化能量 ${result}`)
        }
    })
}

/**
 * 获取 creep 身上的首个非能量资源
 */
const getUnenergyResource = function (creep: Creep): ResourceConstant | undefined {
    return Object.keys(creep.store).find(res => res !== RESOURCE_ENERGY) as ResourceConstant
}

/**
 * 处理掉 creep 身上携带的能量
 * 运输者在之前处理任务的时候身上可能会残留能量，如果不及时处理的话可能会导致任务处理能力下降
 * 
 * @param creep 要净空的 creep
 * @returns 为 true 时代表已经处理完成，可以继续执行任务
 */
const clearCarrying = function (creep: Creep, clearResource: ResourceConstant): boolean {
    const targetRes = clearResource ? clearResource : Object.keys(creep.store)[0] as ResourceConstant
    if (creep.store[targetRes] > 0) {
        // 能放下就放，放不下说明能量太多了，直接扔掉
        if (creep.room.storage?.store.getFreeCapacity() >= creep.store[targetRes]) {
            creep.transferTo(creep.room.storage, targetRes)
        }
        else if (targetRes === RESOURCE_ENERGY) creep.drop(targetRes)

        return false
    }

    return true
}

/**
 * 搬运工去房间内获取能量
 * 
 * @param creep 要获取能量的 creep
 * @returns 身上是否已经有足够的能量了
 */
const getEnergy = function (creep: RoleCreep<CreepRole.Manager>, transport: RoomTransport): boolean {
    if (creep.store[RESOURCE_ENERGY] > 40) return true
    if (!clearCarrying(creep, getUnenergyResource(creep))) return false

    // 从工作房间查询并缓存能量来源
    const source = useCache<EnergySourceStructure | Resource<RESOURCE_ENERGY>>(() => {
        const { getClosestTo } = findStrategy
        return getRoomEnergyTarget(creep.room, getClosestTo(creep.pos))
    }, creep.memory, 'sourceId')

    if (
        !source ||
        (source instanceof Structure && source.store[RESOURCE_ENERGY] <= 0) ||
        (source instanceof Resource && source.amount <= 0)
    ) {
        // 先移动到目标附件待命
        let target = source ? source : creep.room.source[0]
        if (target) creep.goTo(target.pos, { range: 3 })
        else creep.say('😯没能量呀')

        delete creep.memory.sourceId
        return false
    }

    // 获取能量
    const result = creep.getEngryFrom(source)
    transport.countWorkTime()
    return result === OK
}

/**
 * 填充房间内的 spawn 和 extension
 * 
 * @param creep 要执行任务的单位
 * @returns 正在填充时返回 OK，没有需要填充的建筑返回 ERR_NOT_FOUND，没有能量返回 ERR_NOT_ENOUGH_ENERGY
 */
export const fillSpawnStructure = function (creep: Creep): OK | ERR_NOT_FOUND | ERR_NOT_ENOUGH_ENERGY {
    if (creep.store[RESOURCE_ENERGY] === 0) return ERR_NOT_ENOUGH_ENERGY
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

        if (!target) return ERR_NOT_FOUND

        // 写入缓存
        creep.memory.fillStructureId = target.id
    }

    // 有的话就填充能量
    const result = creep.transferTo(target, RESOURCE_ENERGY)

    if (result === ERR_NOT_ENOUGH_RESOURCES) return ERR_NOT_ENOUGH_ENERGY
    // 装满了就移除缓存，等下个 tick 重新搜索
    else if (result === ERR_FULL) delete creep.memory.fillStructureId
    else if (result != OK && result != ERR_NOT_IN_RANGE) creep.say(`拓展填充 ${result}`)
    return OK
}
