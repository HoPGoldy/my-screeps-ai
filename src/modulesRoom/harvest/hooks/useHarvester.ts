import { createRoleController } from '@/modulesRoom/unitControl/controller'
import { createEnvContext, createReactiveBody, createStaticBody } from '@/utils'
import { HarvesterActionStrategy, HarvestMemory } from '..'
import { DEFAULT_HARVESTER_ROLE } from '../constants'
import { HarvestContext, HarvesterMemory, HarvestMode } from '../types'
import { useHarvesterSimple } from './useHarvesterSimple'
import { useHarvesterStart } from './useHarvesterStart'
import { useHarvesterTransport } from './useHarvesterTransport'

/**
 * 生成能量矿采集单位的名字
 */
export const getHarvesterName = (roomName: string, sourceId: Id<Source>) => {
    return `${roomName} harvester${sourceId.slice(sourceId.length - 4)}`
}

/**
 * 生成能量矿采集单位的身体
 * 可以传入 mode 来生成符合对应 HarvestMode 的身体（不传则默认使用 HarvestMode.Start）
 */
export const getHarvesterBody = createStaticBody(
    [[WORK, 2], [CARRY, 1], [MOVE, 1]],
    [[WORK, 4], [CARRY, 1], [MOVE, 2]],
    [[WORK, 5], [CARRY, 1], [MOVE, 3]],
    [[WORK, 6], [CARRY, 1], [MOVE, 4]],
    [[WORK, 10], [CARRY, 1], [MOVE, 5]],
    [[WORK, 12], [CARRY, 1], [MOVE, 6]],
    [[WORK, 16], [CARRY, 1], [MOVE, 6]],
    [[WORK, 20], [CARRY, 1], [MOVE, 6]]
)

/**
 * 能量矿采集单位
 * 从指定 source 中获取能量 > 根据策略不同将能量转移到不同位置
 */
export const useHarvester = function (context: HarvestContext) {
    const {
        env, getMemory, addSpawnTask, addSpawnCallback, sourceUtils, onCreepStageChange,
        harvesterRole = DEFAULT_HARVESTER_ROLE
    } = context

    /**
     * 从能量矿获取当前采集工应有的采集状态
     *
     * @param source 要获取工作状态的能量矿
     * @param memory 保存采集状态的内存对象
     */
    const setHarvestMode = function (source: Source, memory: HarvesterMemory): void {
        // 优先往 link 里运
        const nearLink = sourceUtils.getLink(source)
        if (nearLink) {
            memory.mode = HarvestMode.Transport
            memory.storeId = nearLink.id
            return
        }

        // 其次是 container
        const nearContainer = sourceUtils.getContainer(source)
        if (nearContainer) {
            memory.mode = HarvestMode.Simple
            memory.storeId = nearContainer.id
            return
        }

        // 啥都没有就启动模式
        memory.mode = HarvestMode.Start
    }

    /**
     * 采集模式及其对应的执行逻辑
     */
    const actionStrategys: { [mode in HarvestMode]: HarvesterActionStrategy } = {
        [HarvestMode.Start]: useHarvesterStart(context),
        [HarvestMode.Simple]: useHarvesterSimple(context, setHarvestMode),
        [HarvestMode.Transport]: useHarvesterTransport(context)
    }

    const harvester = createRoleController<HarvesterMemory>({
        getMemory: room => {
            const memory = getMemory(room)
            if (!memory.harvesters) memory.harvesters = {}
            return memory.harvesters
        },
        onCreepDead: (creepName, memory, workRoom) => releaseHarvester(workRoom, memory.sourceId),
        runPrepare: (creep, memory) => {
            const { mode, sourceId } = memory
            const source = env.getObjectById(sourceId)

            // 设置采集模式
            if (!mode) setHarvestMode(source, memory)

            // 执行各自的准备逻辑
            return actionStrategys[memory.mode].prepare(creep, source, memory)
        },
        /**
         * 采集能量矿
         */
        runSource: (creep, memory) => {
            const source = env.getObjectById(memory.sourceId)
            return actionStrategys[memory.mode].source(creep, source, memory)
        },
        /**
         * 运回存储建筑
         */
        runTarget: (creep, memory) => {
            const source = env.getObjectById(memory.sourceId)
            return actionStrategys[memory.mode].target(creep, source, memory)
        },
        onCreepStageChange
    })

    addSpawnCallback(harvesterRole, harvester.addUnit)

    /**
     * 发布能量采集单位
     *
     * @param room 要发布到的房间
     * @param source 要采集的能量矿 id
     */
    const releaseHarvester = function (room: Room, sourceId: Id<Source>) {
        const creepName = getHarvesterName(room.name, sourceId)
        addSpawnTask(room, creepName, harvesterRole, getHarvesterBody(room.energyAvailable))
        harvester.registerUnit(creepName, { sourceId }, room)
    }

    return { harvester, releaseHarvester }
}
