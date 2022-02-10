import { TransportTaskType } from '@/modulesRoom'
import { createEnvContext, createHelp } from '@/utils'
import { PowerSpawnMemory } from '@/modulesRoom/powerSpawn/types'
import { createPowerSpawnController } from '@/modulesRoom/powerSpawn/powerSpawnController'
import { getPowerSpawn } from './shortcut'

declare global {
    interface RoomMemory {
        ps: PowerSpawnMemory
    }
}

export const getPsController = createPowerSpawnController({
    getMemory: room => {
        if (!room.memory.ps) room.memory.ps = {}
        return room.memory.ps
    },
    getRoomPowerSpawn: getPowerSpawn,
    getResAmount: (room, resType) => {
        const { total } = room.storageController.getResource(resType)
        return total
    },
    hasFillPowerSpawnTask: room => room.transport.hasTaskWithType(TransportTaskType.FillPowerSpawn),
    addFillPowerSpawnTask: (ps, resType, amount) => {
        ps.room.transport.addTask({
            type: TransportTaskType.FillPowerSpawn,
            requests: [{ resType, amount, to: ps.id }]
        })
    },
    env: createEnvContext('powerSpawn')
})
