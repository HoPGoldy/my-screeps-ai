import { setCreepStand } from '@/modulesGlobal/move'
import { WorkTaskType } from '@/modulesRoom'
import { createHarvestController, HarvestMemory } from '@/modulesRoom/harvest'
import { WORK_TASK_PRIOIRY } from '@/modulesRoom/taskWork'
import { createEnvContext } from '@/utils'
import { CreepRole } from '../creep/types'
import { addConstructionSite } from '../global/construction'
import { withDelayCallback } from '../global/delayQueue'
import { sourceUtils } from '../global/source'
import { getMineral, getSource, getSpawn } from './shortcut'
import { addSpawnCallback } from './spawn'

declare global {
    interface RoomMemory {
        /**
         * 采集管理模块内存
         */
        harvest: HarvestMemory
    }
}

export const getHarvestController = createHarvestController({
    minerRole: CreepRole.Miner,
    harvesterRole: CreepRole.Harvester,
    getMemory: room => {
        if (!room.memory.harvest) room.memory.harvest = {}
        return room.memory.harvest
    },
    sourceUtils,
    withDelayCallback,
    getMineral,
    getSource,
    getSpawn,
    addSpawnTask: (room, ...args) => room.spawnController.addTask(...args),
    addSpawnCallback,
    getResourceAmount: (room, resType) => {
        const { total } = room.storageController.getResource(resType)
        return total
    },
    addConstructionSite: (pos, type) => {
        const { x, y, roomName } = pos
        addConstructionSite([{ x, y, roomName, type }])
    },
    addBuildCotainerTask: (room, source) => {
        // container 建造任务的优先级应该是最高的
        room.work.addTask({ type: WorkTaskType.BuildContainer, sourceId: source.id, priority: 4 })
    },
    addRepairContainerTask: room => {
        // 修个小 container，派一个人来修就可以了
        room.work.updateTask({
            type: WorkTaskType.Repair, need: 1, priority: WORK_TASK_PRIOIRY.REPAIR
        }, { dispath: true })
    },
    getRoomTransportor: room => room.transport.getUnit(),
    hasTransportTask: (room, taskId) => room.transport.hasTaskWithKey(Number(taskId)),
    addTransportTask: (source, requests) => {
        return source.room.transport.updateTask({
            // 这里用 source 的 id 是为了避免多个 container 的转移任务覆盖彼此
            type: source.id.slice(source.id.length - 4),
            requests
        }, { dispath: true })
    },
    requestPowerSource: source => source.room.power.addTask(PWR_REGEN_SOURCE) === OK,
    onCreepStageChange: (creep, isWorking) => setCreepStand(creep.name, isWorking),
    env: createEnvContext('harvest')
})
