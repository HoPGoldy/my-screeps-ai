import { findStrategy, getRoomEnergyTarget } from '@/modulesGlobal/energyUtils'
import { goTo, setCreepStand } from '@/modulesGlobal/move'
import { WorkTaskMemory, createWorkController } from '@/modulesRoom/taskWork'
import { createEnvContext } from '@/utils'
import { withDelayCallback } from '../global/delayQueue'
import { sourceUtils } from '../global/source'
import { addSpawnCallback } from './spawn'

declare global {
    interface RoomMemory {
        /**
         * 房间工作任务内存
         */
        work: WorkTaskMemory
    }
}

export const getWorkController = createWorkController({
    sourceUtils,
    withDelayCallback,
    goTo,
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
    onCreepStageChange: (creep, isWorking) => setCreepStand(creep.name, isWorking),
    env: createEnvContext('work')
})
