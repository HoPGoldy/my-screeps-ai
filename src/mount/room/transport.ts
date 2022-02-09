import { goTo, setCreepStand } from '@/modulesGlobal/move'
import { createTransportController, TransportMemory } from '@/modulesRoom/taskTransport'
import { createEnvContext } from '@/utils'
import { sourceUtils } from '../global/source'
import { getContainer, getStructure, getSource } from './shortcut'
import { addSpawnCallback } from './spawn'

declare global {
    interface RoomMemory {
        /**
         * 房间物流任务内存
         */
        transport: TransportMemory
    }
}

export const getTransportController = createTransportController({
    sourceUtils,
    goTo,
    getContainer, getStructure, getSource,
    getMemory: room => {
        if (!room.memory.transport) room.memory.transport = {}
        return room.memory.transport
    },
    addSpawnTask: (room, ...args) => room.spawnController.addTask(...args),
    addSpawnCallback,
    onCreepStageChange: (creep, isWorking) => setCreepStand(creep.name, isWorking),
    env: createEnvContext('transport')
})
