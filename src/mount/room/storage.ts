import { TransportTaskType } from '@/modulesRoom'
import { createHelp, createEnvContext } from '@/utils'
import { createStorageController } from '@/modulesRoom/storage/storageController'

export const getStorageController = createStorageController({
    requestShareRoom: (room, resType, amount) => room.share.request(resType, amount),
    addPowerStroageTask: room => room.share.becomeSource(RESOURCE_ENERGY),
    canShareEnergy: room => room.share.becomeSource(RESOURCE_ENERGY),
    addTransportTask: (room, requests) => {
        // 要先移除再添加，防止重复搬运
        room.transport.removeTaskByType(TransportTaskType.StorageBlance)
        room.transport.addTask({
            type: TransportTaskType.StorageBlance,
            requests
        })
    },
    env: createEnvContext('storage')
})
