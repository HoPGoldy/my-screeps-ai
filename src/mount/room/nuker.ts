import { createNukerController } from '@/modulesRoom/nuker/unkerController'
import { setRoomStats } from '@/modulesGlobal/stats'
import { TransportTaskType } from '@/modulesRoom'
import { createCache, createEnvContext } from '@/utils'

declare global {
    interface Memory {
        /**
         * 核弹投放指示器
         * 核弹是否已经确认
         */
        nukerReady?: number
        /**
         * 核弹发射指令集，键为发射房间，值为目标旗帜名称
         */
        nukerDirective?: Record<string, string>
    }
}

const { mountNuker, lazyLoader: lazyLoadNuker } = createNukerController({
    getGlobalMemory: () => Memory,
    getRoomNuker: room => room[STRUCTURE_NUKER],
    getResAmount: (room, resType) => {
        const { total } = room.storageController.getResource(resType)
        return total
    },
    scanState: nuker => {
        if (Game.time % 20) return
        setRoomStats(nuker.room.name, () => ({
            nukerEnergy: nuker.store[RESOURCE_ENERGY],
            nukerG: nuker.store[RESOURCE_GHODIUM],
            nukerCooldown: nuker.cooldown
        }))
    },
    hasFillNukerTask: room => room.transport.hasTaskWithType(TransportTaskType.FillNuker),
    addFillNukerTask: (nuker, resType, amount) => {
        nuker.room.transport.addTask({
            type: TransportTaskType.FillNuker,
            requests: [{ resType, amount, to: nuker.id }]
        })
    },
    env: createEnvContext('nuker')
})

export const [getNukerController] = createCache(lazyLoadNuker)
export { mountNuker }
