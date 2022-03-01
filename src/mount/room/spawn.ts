import { TransportTaskType } from '@/modulesRoom'
import { createEnvContext } from '@/utils'
import { getSpawn } from './shortcut'
import { createSpawnController, SpawnTask } from '@/modulesRoom/spawn'
import { CreepRole } from '../creep/types'

declare global {
    interface RoomMemory {
        spawnList?: SpawnTask[]
        /**
         * 当前是否外借 spawn
         */
        lendSpawn?: boolean
    }
}

export const { getSpawnController, addSpawnCallback } = createSpawnController({
    importantRoles: [CreepRole.Harvester, CreepRole.Manager],
    getMemory: room => room.memory,
    getSpawn,
    requestFill: room => {
        room.transport.updateTask({
            type: TransportTaskType.FillExtension,
            priority: 10,
            requests: [{ resType: RESOURCE_ENERGY, to: [STRUCTURE_SPAWN, STRUCTURE_EXTENSION], keep: true }]
        }, { dispath: true })
    },
    requestPowerExtension: room => room.power.addTask(PWR_OPERATE_EXTENSION, 1),
    env: createEnvContext('spawn')
})
