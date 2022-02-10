import { TransportTaskType } from '@/modulesRoom'
import { createHelp, createEnvContext } from '@/utils'
import { createShareController } from '@/modulesRoom/share/shareController'
import { ResourceSourceMap, RoomShareTask } from '@/modulesRoom/share/types'

declare global {
    interface RoomMemory {
        /**
         * 该房间要执行的资源共享任务
         */
        shareTask: RoomShareTask
    }

    interface Memory {
        resourceSourceMap: ResourceSourceMap,
    }
}

export const getShareController = createShareController({
    getGlobalMemory: () => {
        if (!Memory.resourceSourceMap) Memory.resourceSourceMap = {}
        return Memory.resourceSourceMap
    },
    getMemory: room => {
        if (!room.memory.shareTask) room.memory.shareTask = {}
        return room.memory.shareTask
    },
    clearMemory: room => {
        delete room.memory.shareTask
    },
    getRoomRes: (room, resType) => {
        const { total } = room.storageController.getResource(resType)
        return total
    },
    hasTransportTask: room => room.transport.hasTaskWithType(TransportTaskType.Share),
    addTransportTask: (room, requests) => room.transport.addTask({
        type: TransportTaskType.Share, requests
    }),
    env: createEnvContext('share')
})
