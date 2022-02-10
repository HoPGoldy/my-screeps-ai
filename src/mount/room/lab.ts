import { TransportTaskType } from '@/modulesRoom'
import { createEnvContext } from '@/utils'
import { getLab } from './shortcut'
import { LabMemory, createLabController, LabTransportType } from '@/modulesRoom/lab'
import { goTo } from '@/modulesGlobal/move'

declare global {
    interface RoomMemory {
        lab: LabMemory
    }
}

/**
 * 把 lab 的物流任务类型映射到物流模块的任务类型
 */
const TypeMapping = {
    [LabTransportType.LabIn]: TransportTaskType.LabIn,
    [LabTransportType.LabOut]: TransportTaskType.LabOut,
    [LabTransportType.LabGetEnergy]: TransportTaskType.LabGetEnergy
}

export const getLabController = createLabController({
    goTo: (creep, pos) => goTo(creep, pos, {}),
    getMemory: room => {
        if (!room.memory.lab) room.memory.lab = {}
        return room.memory.lab
    },
    hasTransportTask: (room, type) => room.transport.hasTaskWithType(TypeMapping[type]),
    addTransportTask: (room, type, requests) => room.transport.addTask({
        type: TypeMapping[type],
        requests
    }),
    getLab,
    getResourceAmount: (room, resType) => {
        const { total } = room.storageController.getResource(resType)
        return total
    },
    env: createEnvContext('lab')
})
