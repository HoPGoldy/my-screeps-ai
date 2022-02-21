import { goTo, setCreepStand } from '@/modulesGlobal/move'
import { createRemoteController, RemoteMemory } from '@/modulesRoom/remote'
import { createEnvContext } from '@/utils'
import { withDelayCallback } from '../global/delayQueue'
import { sourceUtils } from '../global/source'
import { getLink, getContainer } from './shortcut'
import { addSpawnCallback } from './spawn'

declare global {
    interface RoomMemory {
        /**
         * 房间扩张模块内存
         */
        remote: RemoteMemory
    }
}

export const getRemoteController = createRemoteController({
    sourceUtils,
    withDelayCallback,
    goTo,
    getMemory: room => {
        if (!room.memory.remote) room.memory.remote = {}
        return room.memory.remote
    },
    getLink,
    getContainer,
    addSpawnTask: (room, ...args) => room.spawnController.addTask(...args),
    addSpawnCallback,
    onCreepStageChange: (creep, isWorking) => setCreepStand(creep.name, isWorking),
    env: createEnvContext('remote')
})
