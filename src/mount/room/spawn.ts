import { TransportTaskType } from '@/modulesRoom'
import { createEnvContext } from '@/utils'
import { getSpawn } from './shortcut'
import { createSpawnController, RoomBaseUnitLimit, SpawnTask } from '@/modulesRoom/spawn'

declare global {
    interface RoomMemory {
        spawnList?: SpawnTask[]
        /**
         * 当前是否外借 spawn
         */
        lendSpawn?: boolean
        /**
         * 该房间的基础运维单位上下限
         * 不存在时将使用 ./constant.ts 中的 BASE_ROLE_LIMIT
         */
        baseUnitLimit?: RoomBaseUnitLimit
    }
}

export const { getSpawnController, addSpawnCallback } = createSpawnController({
    getMemory: room => room.memory,
    getSpawn,
    requestFill: room => {
        room.transport.updateTask({
            type: TransportTaskType.FillExtension,
            priority: 10,
            requests: [{ resType: RESOURCE_ENERGY, to: [STRUCTURE_SPAWN, STRUCTURE_EXTENSION], keep: true }]
        }, { dispath: true })
    },
    requestPowerExtension: room => {
        room.power.addTask(PWR_OPERATE_EXTENSION, 1)
    },
    env: createEnvContext('spawn')
})
