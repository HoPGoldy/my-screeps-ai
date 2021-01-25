import { getRoomEnergyTarget, findStrategy } from 'modules/energyController'
import { fillSpawnStructure } from 'modules/roomTask/transpoart/actions'
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
     * 元素采集任务
     */
    mine: (creep, task, workController) => ({
        source: () => {
            if (creep.store.getFreeCapacity() === 0) return true

            // 采矿
            const mineral = Game.rooms[creep.memory.data.workRoom]?.mineral
            // 找不到矿或者矿采集完了，添加延迟孵化并结束任务
            if (!mineral || mineral.mineralAmount <= 0) {
                addSpawnMinerTask(mineral.room.name, mineral.ticksToRegeneration)
                workController.removeTask(task.key)
            }

            const harvestResult = creep.harvest(mineral)
            if (harvestResult === ERR_NOT_IN_RANGE) creep.goTo(mineral.pos)
        },
        target: () => {
            const target: StructureTerminal = Game.rooms[creep.memory.data.workRoom]?.terminal
            if (!target) {
                creep.say('放哪？')
                workController.removeTask(task.key)
                return false
            }
    
            creep.transferTo(target, Object.keys(creep.store)[0] as ResourceConstant)
    
            if (creep.store.getUsedCapacity() === 0) return true
        },
    }),

    /**
     * 升级任务
     */
    upgrade: creep => ({
        source: () => getEnergy(creep),
        target: () => creep.upgrade() === ERR_NOT_ENOUGH_RESOURCES
    }),

    /**
     * 初始 container 建造任务
     * 和下面建造任务最大的区别就是这个只会从对应 source 旁的能量获取任务
     * 防止跑 sourceA 取能量造 sourceB 的 conatiner，这会导致浪费很多时间在路上
     */
    buildStartContainer: (creep, task, workController) => ({
        source: () => {
            if (creep.store[RESOURCE_ENERGY] >= 20) return true

            const source = Game.getObjectById(task.sourceId)
            if (!source) {
                creep.log(`找不到 source，container 建造任务移除`, 'yellow')
                workController.removeTask(task.key)
                return false
            }
            // 建造初始 container 时一无所有，所以只会捡地上的能量来用
            const droppedEnergy = source.getDroppedInfo().energy
            if (!droppedEnergy || droppedEnergy.amount < 100) {
                creep.say('等待能量回复')
                // 等待时先移动到附近
                creep.goTo(source.pos, { range: 3 })
                return false
            }

            creep.goTo(droppedEnergy.pos, { range: 1 })
            creep.pickup(droppedEnergy)
            return true
        },
        target: () => {
            if (creep.store[RESOURCE_ENERGY] === 0) return true

            // 搜索 source 附近的 container 工地并缓存
            const containerSite = useCache(() => {
                const source = Game.getObjectById(task.sourceId)

                if (!source) {
                    creep.log(`找不到 source，container 建造任务移除`, 'yellow')
                    workController.removeTask(task.key)
                    return
                }

                // 这里找的范围只要在 creep 的建造范围之内就行
                const containerSites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 2, {
                    filter: site => site.structureType === STRUCTURE_CONTAINER
                })

                // 找不到了，说明任务完成
                if (containerSites.length <= 0) {
                    workController.removeTask(task.key)
                    return
                }

                return containerSites[0]
            }, creep.memory, 'constructionSiteId')

            const result = creep.build(containerSite)
            if (result === ERR_NOT_IN_RANGE) creep.goTo(containerSite.pos, { range: 3 })
        }
    }),

    /**
     * 建造任务
     */
    build: (creep, task, workController) => ({
        source: () => getEnergy(creep),
        target: () => {
            if (creep.store[RESOURCE_ENERGY] === 0) return true

            // 有新墙就先刷新墙
            if (creep.memory.fillWallId) creep.steadyWall()
            // 没有就建其他工地，如果找不到工地了，就算任务完成
            else {
                // 优先建设任务中指定的工地
                const taskTarget = Game.getObjectById(task.targetId)
                if (creep.buildStructure(taskTarget) === ERR_NOT_FOUND) {
                    workController.removeTask(task.key)
                    return true
                }
            }
        }
    }),

    /**
     * 维修任务
     */
    repair: (creep, task, workController) => ({
        source: () => getEnergy(creep),
        target: () => {
            if (creep.store[RESOURCE_ENERGY] === 0) return true
            const room = Game.rooms[creep.memory.data.workRoom]
            if (!room) {
                workController.removeTask(task.key)
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
                workController.removeTask(task.key)
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

    // 获取有效的能量来源并缓存能量来源
    const source = useCache<EnergySourceStructure | Resource<RESOURCE_ENERGY>>(() => {
        const { getClosestTo, withLimit } = findStrategy
        return getRoomEnergyTarget(creep.room, getClosestTo(creep.pos), withLimit)
    }, creep.memory, 'sourceId')

    if (!source) {
        creep.say('没能量了，歇会')
        return false
    }

    const result = creep.getEngryFrom(source)

    // 之前用的能量来源没能量了就更新来源
    if (result === OK) {
        delete creep.memory.sourceId
        return true
    }
    else if (result === ERR_NOT_ENOUGH_RESOURCES) delete creep.memory.sourceId
}