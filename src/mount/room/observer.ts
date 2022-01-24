import { setCreepStand } from '@/modulesGlobal/move'
import { WorkTaskType } from '@/modulesRoom'
import { createHarvestController, HarvestMemory } from '@/modulesRoom/harvest'
import { createObserverController } from '@/modulesRoom/observer/controller'
import { ObserverMemory } from '@/modulesRoom/observer/types'
import { WORK_TASK_PRIOIRY } from '@/modulesRoom/taskWork/constant'
import { createEnvContext } from '@/utils'
import { addConstructionSite } from '../global/construction'
import { withDelayCallback } from '../global/delayQueue'
import { sourceUtils } from '../global/source'
import { getObserver } from './shortcut'
import { addSpawnCallback } from './spawn'

declare global {
    interface RoomMemory {
        /**
         * 终端内存
         */
        observer?: ObserverMemory
    }
}

export const { getObserverController, globalShowObserver } = createObserverController({
    getMemory: room => {
        if (!room.memory.observer) room.memory.observer = {}
        return room.memory.observer
    },
    getObserver,
    addSpawnTask: (room, ...args) => room.spawnController.addTask(...args),
    addSpawnCallback,
    onPbTransferFinish: room => room.terminalController.balancePower(),
    onCreepStageChange: (creep, isWorking) => setCreepStand(creep.name, isWorking),
    env: createEnvContext('observer')
})
