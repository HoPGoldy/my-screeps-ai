import { findStrategy, getRoomEnergyTarget } from '@/modulesGlobal/energyUtils'
import { setCreepStand } from '@/modulesGlobal/move'
import { WorkTaskType } from '@/modulesRoom'
import { createHarvestController, HarvestMemory } from '@/modulesRoom/harvest'
import { WORK_TASK_PRIOIRY } from '@/modulesRoom/taskWork/constant'
import { WorkTaskMemory, createWorkTaskController } from '@/modulesRoom/taskWorkNew'
import { createEnvContext } from '@/utils'
import { addConstructionSite } from '../global/construction'
import { withDelayCallback } from '../global/delayQueue'
import { sourceUtils } from '../global/source'
import { getMineral, getSource, getSpawn } from './shortcut'
import { addSpawnCallback } from './spawn'

declare global {
    interface RoomMemory {
        /**
         * 房间工作任务内存
         */
        work: WorkTaskMemory
    }
}

export const getHarvestController = createWorkTaskController({
    sourceUtils,
    getMemory: room => {
        if (!room.memory.work) room.memory.work = {}
        return room.memory.work
    },
    addSpawnTask: (room, ...args) => room.spawnController.addTask(...args),
    addSpawnCallback,
    getEnergyStructure: (room, pos) => {
        const { getClosestTo, withLimit } = findStrategy
        return getRoomEnergyTarget(room, getClosestTo(pos), withLimit)
    },
    env: createEnvContext('work')
})
