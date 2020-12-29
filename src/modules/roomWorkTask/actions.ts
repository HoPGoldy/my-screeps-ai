import { getRoomAvailableSource } from "modules/energyController"

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
            return true
        },
        target: () => {
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