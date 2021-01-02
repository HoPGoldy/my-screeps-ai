import { getRoomAvailableSource } from 'modules/energyController'
import { fillSpawnStructure } from 'modules/roomTransportTask/actions'

// 采集单位的行为模式
const HARVEST_MODE: {
    START: HarvestModeStart,
    SIMPLE: HarvestModeSimple,
    TRANSPORT: HarvestModeTransport
} = {
    START: 1,
    SIMPLE: 2,
    TRANSPORT: 3
}

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
     */
    harvest: (creep, task) => ({
        source: () => {
            if (
                // 如果是简单模式的话就永远不会进入 target 阶段
                task.mode !== HARVEST_MODE.SIMPLE &&
                // 身上装满了
                creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0
            ) return true

            const source = Game.getObjectById(creep.memory.data.sourceId)
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
    mine: (creep, task) => ({
        source: () => {
            return true
        },
        target: () => {
            return true
        }
    }),

    /**
     * 升级任务
     */
    upgrade: (creep, task) => ({
        source: () => {
            return true
        },
        target: () => {
            return true
        }
    }),

    /**
     * 建造任务
     */
    build: (creep, task) => ({
        source: () => {
            return true
        },
        target: () => {
            return true
        }
    }),

    /**
     * 维修任务
     */
    repair: (creep, task) => ({
        source: () => {
            return true
        },
        target: () => {
            return true
        }
    }),

    /**
     * 刷墙任务
     */
    fillWall: (creep, task) => ({
        source: () => {
            return true
        },
        target: () => {
            return true
        }
    })
}

/**
 * creep 完成自己正在执行的工作
 * 
 * @param creep 要完成工作的 creep
 */
const finishTask = function (creep: MyCreep<'manager'>): void {
    const { workRoom } = creep.memory.data
    Game.rooms[workRoom]?.transport.removeTask(creep.memory.transportTaskKey)
}

/**
 * creep 去房间内获取能量
 * 
 * @param creep 要获取能量的 creep
 * @returns 身上是否已经有足够的能量了
 */
const getEnergy = function (creep: MyCreep<'manager'>): boolean {
    if (creep.store[RESOURCE_ENERGY] > 10) return true

    // 从内存中找到缓存的能量来源
    const { sourceId, workRoom } = creep.memory.data
    let sourceStructure = Game.getObjectById(sourceId)

    // 来源建筑不可用，更新来源
    if (!sourceStructure || sourceStructure.store[RESOURCE_ENERGY] <= 0) {
        sourceStructure = getRoomAvailableSource(Game.rooms[workRoom], { includeSource: false })

        // 更新失败，现在房间里没有可用的能量源，挂机
        if (!sourceStructure) {
            creep.say('⛳')
            return false
        }

        creep.memory.data.sourceId = sourceStructure.id
    }

    // 获取能量
    const result = creep.getEngryFrom(sourceStructure)
    return result === OK
}