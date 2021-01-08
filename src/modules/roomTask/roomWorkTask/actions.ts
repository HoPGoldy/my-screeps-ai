import { getRoomAvailableSource } from 'modules/energyController'
import { fillSpawnStructure } from 'modules/roomTask/roomTransportTask/actions'
import { useCache } from 'utils'
import { addSpawnMinerTask } from './delayTask'
import { HARVEST_MODE } from 'setting'

/**
 * @warning 在任务完成时要及时清除该任务在 creep 内存中留下的缓存
 * 防止影响后续任务行为
 */

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
    [TaskType in AllWorkTaskType]: WorkActionGenerator<TaskType>
} = {
    /**
     * 能量采集任务
     * 能量采集任务永远不会主动清除
     */
    harvest: (creep, task) => ({
        source: () => {
            if (
                // 如果是简单模式的话就永远不会进入 target 阶段
                task.mode !== HARVEST_MODE.SIMPLE &&
                // 身上装满了
                creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0
            ) return true

            const source = Game.getObjectById(task.id)
            const result = creep.getEngryFrom(source)

            if (task.mode === HARVEST_MODE.SIMPLE) {
                // 快死了就把身上的能量丢出去，这样就会存到下面的 container 里，否则变成墓碑后能量无法被 container 自动回收
                if (creep.ticksToLive < 2) creep.drop(RESOURCE_ENERGY)
            }
            // 转移模式下会尝试请求 power 强化 source
            else if (task.mode === HARVEST_MODE.TRANSPORT) {
                if (result === ERR_NOT_ENOUGH_RESOURCES) {
                    // 如果满足下列条件就重新发送 regen_source 任务
                    if (
                        // creep 允许重新发布任务
                        (!creep.memory.regenSource || creep.memory.regenSource < Game.time) &&
                        // source 上没有效果
                        (!source.effects || !source.effects[PWR_REGEN_SOURCE])
                    ) {
                        // 并且房间内的 pc 支持这个任务
                        if (creep.room.memory.powers && creep.room.memory.powers.split(' ').includes(String(PWR_REGEN_SOURCE))) {
                            // 添加 power 任务，设置重新尝试时间
                            creep.room.addPowerTask(PWR_REGEN_SOURCE)
                            creep.memory.regenSource = Game.time + 300
                        }
                        else creep.memory.regenSource = Game.time + 1000
                    }
                }

                // 快死了就把能量移出去
                if (creep.ticksToLive < 2) return true
            }
        },
        target: () => {
            if (creep.store.getUsedCapacity() === 0) return true

            // 启动模式下搬运能量到 spawn 和 extension
            if (task.mode === HARVEST_MODE.START) {
                const result = fillSpawnStructure(creep)

                if (result === ERR_NOT_FOUND) {
                    creep.say('💤')
                    return true
                }
                else if (result === ERR_NOT_ENOUGH_ENERGY) return true
            }
            // 简单模式下只会无脑采集
            else if (task.mode === HARVEST_MODE.SIMPLE) return true
            // 转移模式下转移到对应的建筑
            else if (task.mode === HARVEST_MODE.TRANSPORT) {
                const target = Game.getObjectById(task.targetId) || creep.room.storage

                if (!target) {
                    creep.say('我目标呢？')
                    return false
                }

                creep.transferTo(target, RESOURCE_ENERGY)
            }
            else {
                creep.say('这活我干不了啊')
                creep.log(`发现未知的 task.mode: ${task.mode}`, 'yellow')
            }
            return true
        }
    }),

    /**
     * 元素采集任务
     */
    mine: (creep, task, taskKey, workController) => ({
        source: () => {
            if (creep.store.getFreeCapacity() === 0) return true

            // 采矿
            const mineral = Game.rooms[creep.memory.data.workRoom]?.mineral
            // 找不到矿或者矿采集完了，添加延迟孵化并结束任务
            if (!mineral || mineral.mineralAmount <= 0) {
                addSpawnMinerTask(mineral.room.name, mineral.ticksToRegeneration)
                workController.removeTask(taskKey)
            }

            const harvestResult = creep.harvest(mineral)
            if (harvestResult === ERR_NOT_IN_RANGE) creep.goTo(mineral.pos)
        },
        target: () => {
            const target: StructureTerminal = Game.rooms[creep.memory.data.workRoom]?.terminal
            if (!target) {
                creep.say('放哪？')
                workController.removeTask(taskKey)
                return false
            }
    
            creep.transferTo(target, Object.keys(creep.store)[0] as ResourceConstant)
    
            if (creep.store.getUsedCapacity() === 0) return true
        },
    }),

    /**
     * 升级任务
     */
    upgrade: (creep) => ({
        source: () => getEnergy(creep),
        target: () => creep.upgrade() === ERR_NOT_ENOUGH_RESOURCES
    }),

    /**
     * 建造任务
     */
    build: (creep, task, taskKey, workController) => ({
        source: () => getEnergy(creep),
        target: () => {
            // 有新墙就先刷新墙
            if (creep.memory.fillWallId) creep.steadyWall()
            // 没有就建其他工地，如果找不到工地了，就算任务完成
            else if (creep.buildStructure() === ERR_NOT_FOUND) {
                workController.removeTask(taskKey)
                return true
            }

            if (creep.store.getUsedCapacity() === 0) return true
        }
    }),

    /**
     * 维修任务
     */
    repair: (creep, task, taskKey, workController) => ({
        source: () => getEnergy(creep),
        target: () => {
            const room = Game.rooms[creep.memory.data.workRoom]
            if (!room) {
                workController.removeTask(taskKey)
                return true
            }

            // 找到受损建筑
            const target: AnyStructure = useCache(() => {
                const damagedStructures = room.find(FIND_STRUCTURES, {
                    filter: s => s.hits < s.hitsMax &&
                        // 墙壁在刷墙任务里维护
                        s.structureType != STRUCTURE_RAMPART &&
                        s.structureType != STRUCTURE_WALL
                })

                // 找到最近的受损建筑并更新缓存
                if (damagedStructures.length > 0) return creep.pos.findClosestByRange(damagedStructures)
            }, creep.memory, 'repairStructureId')

            // 没有需要维修的建筑，任务完成
            if (!target) {
                workController.removeTask(taskKey)
                delete creep.memory.repairStructureId
                return true
            }

            const result = creep.repair(target)

            if (result === ERR_NOT_IN_RANGE) creep.goTo(target.pos, { range: 2 })
            else if (result !== OK) {
                creep.say(`给我修傻了${result}`)
                creep.log(`维修任务异常，repair 返回值: ${result}`)
            }
        }
    }),

    /**
     * 刷墙任务
     */
    fillWall: creep => ({
        source: () => getEnergy(creep),
        target: () => {
            let importantWall = creep.room._importantWall
            // 先尝试获取焦点墙，有最新的就更新缓存，没有就用缓存中的墙
            if (importantWall) creep.memory.fillWallId = importantWall.id
            else if (creep.memory.fillWallId) importantWall = Game.getObjectById(creep.memory.fillWallId)

            // 有焦点墙就优先刷
            if (importantWall) {
                const actionResult = creep.repair(creep.room._importantWall)
                if (actionResult == ERR_NOT_IN_RANGE) creep.goTo(creep.room._importantWall.pos)
            }
            // 否则就按原计划维修
            else creep.fillDefenseStructure()

            if (creep.store.getUsedCapacity() === 0) return true
        }
    })
}

/**
 * creep 去房间内获取能量
 * 
 * @param creep 要获取能量的 creep
 * @returns 身上是否已经有足够的能量了
 */
const getEnergy = function (creep: MyCreep<'worker'>): boolean {
    // 因为只会从建筑里拿，所以只要拿到了就去升级
    // 切换至 target 阶段时会移除缓存，保证下一次获取能量时重新搜索，避免出现一堆人都去挤一个的情况发生
    if (creep.store[RESOURCE_ENERGY] > 10) {
        delete creep.memory.sourceId
        return true
    }

    // 获取有效的能量来源
    let source: AllEnergySource
    if (!creep.memory.sourceId) {
        source = getRoomAvailableSource(creep.room)
        if (!source) {
            creep.say('没能量了，歇会')
            return false
        }

        creep.memory.sourceId = source.id
    }
    else source = Game.getObjectById(creep.memory.sourceId)

    const result = creep.getEngryFrom(source)

    // 之前用的能量来源没能量了就更新来源
    if (result === OK) {
        delete creep.memory.sourceId
        return true
    }
    else if (result === ERR_NOT_ENOUGH_RESOURCES) delete creep.memory.sourceId
}