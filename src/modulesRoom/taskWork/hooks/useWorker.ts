import { WorkTaskType } from '@/modulesRoom'
import { DefaultTaskUnitMemory } from '@/modulesRoom/taskBase'
import { createRole } from '@/modulesRoom/unitControl'
import { createStaticBody, useCache } from '@/utils'
import { getEngryFrom } from '@/utils/creep'
import { WorkerActionStrategy } from '..'
import { WorkerGetEnergy, WorkerRuntimeContext, WorkTaskContext } from '../types'
import { useWorkerBuild } from './useWorkerBuild'
import { useWorkerBuildStartContainer } from './useWorkerBuildStartContainer'
import { useWorkerFillWall } from './useWorkerFillWall'
import { useWorkerRepair } from './useWorkerRepair'
import { useWorkerUpgrade } from './useWorkerUpgrade'

/**
 * 生成工作单位的身体
 */
export const getWorkerBody = createStaticBody(
    [[WORK, 1], [CARRY, 1], [MOVE, 1]],
    [[WORK, 2], [CARRY, 2], [MOVE, 2]],
    [[WORK, 3], [CARRY, 3], [MOVE, 3]],
    [[WORK, 4], [CARRY, 4], [MOVE, 4]],
    [[WORK, 6], [CARRY, 6], [MOVE, 6]],
    [[WORK, 9], [CARRY, 9], [MOVE, 9]],
    [[WORK, 12], [CARRY, 6], [MOVE, 9]],
    [[WORK, 20], [CARRY, 8], [MOVE, 14]]
)

export const useWorker = function (context: WorkTaskContext, getWorkController: WorkerRuntimeContext) {
    const { roleName, getMemory, onCreepStageChange, addSpawnCallback, addSpawnTask, getEnergyStructure, goTo } = context

    /**
     * 没有任务时的行为逻辑
     */
    const noTask = (creep: Creep) => {
        creep.say('💤')
        return false
    }

    /**
     * 通用的 creep 去房间内获取能量
     *
     * @param creep 要获取能量的 creep
     * @returns 身上是否已经有足够的能量了
     */
    const getEnergy: WorkerGetEnergy = function (creep, memory, workRoom) {
        const { countWorkTime } = getWorkController(workRoom)
        // 因为只会从建筑里拿，所以只要拿到了就去升级
        // 切换至 target 阶段时会移除缓存，保证下一次获取能量时重新搜索，避免出现一堆人都去挤一个的情况发生
        if (creep.store[RESOURCE_ENERGY] > 10) {
            countWorkTime()
            delete creep.memory.sourceId
            return true
        }

        // 获取有效的能量来源并缓存能量来源
        const source = useCache<EnergySourceStructure | Resource<RESOURCE_ENERGY>>(
            () => getEnergyStructure(workRoom, creep.pos),
            creep.memory, 'sourceId'
        )

        if (!source) {
            creep.say('没能量了，歇会')
            return false
        }

        countWorkTime()
        const result = getEngryFrom(creep, source)

        // 之前用的能量来源没能量了就更新来源
        if (result === OK) {
            delete creep.memory.sourceId
            return true
        }
        else if (result === ERR_NOT_IN_RANGE) goTo(creep, source.pos, { range: 1 })
        else if (result === ERR_NOT_ENOUGH_RESOURCES) delete creep.memory.sourceId
    }

    /**
     * 不同任务的对应工作逻辑
     */
    const actionStrategys: { [type in WorkTaskType]: WorkerActionStrategy } = {
        [WorkTaskType.Upgrade]: useWorkerUpgrade(context, getEnergy, getWorkController),
        [WorkTaskType.BuildStartContainer]: useWorkerBuildStartContainer(context, getWorkController),
        [WorkTaskType.Build]: useWorkerBuild(context, getEnergy, getWorkController),
        [WorkTaskType.FillWall]: useWorkerFillWall(context, getEnergy, getWorkController),
        [WorkTaskType.Repair]: useWorkerRepair(context, getEnergy, getWorkController)
    }

    /**
     * 执行指定任务的指定阶段
     */
    const runStrategy = function (creep: Creep, stage: keyof WorkerActionStrategy, workRoom: Room) {
        const { getUnitTask, countLifeTime } = getWorkController(workRoom)
        countLifeTime()

        const task = getUnitTask(creep)
        if (!task) return noTask(creep)

        const { x, y } = creep.pos
        creep.room.visual.text(task.type, x, y, { opacity: 0.5, font: 0.3 })
        // 分配完后执行对应任务的工作逻辑
        return actionStrategys[task.type][stage](creep, task, workRoom)
    }

    const worker = createRole<DefaultTaskUnitMemory>({
        getMemory: room => {
            const memory = getMemory(room)
            if (!memory.creeps) memory.creeps = {}
            return memory.creeps
        },
        onCreepDead: (creepName, memory, workRoom) => {
            // 被炒鱿鱼了就停止孵化，否则就一直孵化
            if (memory.fired) return false
            releaseWorker(workRoom, creepName)
        },
        runTarget: (creep, memory, workRoom) => {
            return runStrategy(creep, 'target', workRoom)
        },
        runSource: (creep, memory, workRoom) => {
            return runStrategy(creep, 'source', workRoom)
        },
        onCreepStageChange
    })

    addSpawnCallback(roleName, worker.addUnit)

    /**
     * 发布工作单位
     *
     * @param room 要发布到的房间
     * @param creepName 要发布的单位名称
     */
    const releaseWorker = function (room: Room, creepName: string) {
        addSpawnTask(room, creepName, roleName, getWorkerBody(room.energyAvailable))
    }

    return { worker, releaseWorker }
}
