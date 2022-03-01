import { goTo, setCreepStand } from '@/modulesGlobal/move'
import { createObserverController } from '@/modulesRoom/observer/controller'
import { ObserverMemory } from '@/modulesRoom/observer/types'
import { createEnvContext } from '@/utils'
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
    goTo,
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
