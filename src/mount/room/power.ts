import { AppLifecycleCallbacks } from '@/modulesGlobal/framework/types'
import { goTo } from '@/modulesGlobal/move'
import { createPowerController, GlobalPowerMemory, PowerMemory } from '@/modulesRoom/power'
import { createEnvContext } from '@/utils'
import { getFactory, getSource, getPowerSpawn } from './shortcut'

declare global {
    interface RoomMemory {
        power: PowerMemory
    }

    interface Memory {
        power: GlobalPowerMemory
    }
}

export const { getPowerController, run, setWorkRoom, removeWorkRoom } = createPowerController({
    getMemory: room => {
        if (!room.memory.power) room.memory.power = {}
        return room.memory.power
    },
    goTo,
    getGlobalMemory: () => {
        if (!Memory.power) Memory.power = {}
        return Memory.power
    },
    getResourceStructure: (room, resType, amount) => room.storageController.getResourcePlace(resType, amount),
    getResourceAmount: (room, resType) => {
        const { total } = room.storageController.getResource(resType)
        return total
    },
    getFactory, getSource, getPowerSpawn,
    getFactoryLevel: room => room.factoryController.getLevel(),
    env: createEnvContext('power')
})

export const powerAppPlugin: AppLifecycleCallbacks = {
    tickStart: run
}
