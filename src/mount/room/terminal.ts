import { TransportTaskType } from '@/modulesRoom'
import { createEnvContext } from '@/utils'
import { getMineral } from './shortcut'
import { TerminalMemory, createTerminalController } from '@/modulesRoom/terminal'
import { setRoomStats } from '@/modulesGlobal/stats'

declare global {
    interface RoomMemory {
        terminal: TerminalMemory
    }
}

export const getTerminalController = createTerminalController({
    getMemory: room => {
        if (!room.memory.terminal) room.memory.terminal = {}
        return room.memory.terminal
    },
    balanceResource: room => room.storageController.balanceResource(),
    hasTransportTask: room => room.transport.hasTaskWithType(TransportTaskType.Terminal),
    addTransportTask: (room, requests) => room.transport.addTask({
        type: TransportTaskType.Terminal,
        requests
    }),
    addShareTask: (sourceRoom, targetRoom, resType, amount) => {
        sourceRoom.share.handle(targetRoom.name, resType, amount)
    },
    requestShare: (room, resType, amount) => {
        room.share.request(resType, amount)
    },
    hasShareTask: room => room.share.hasShareTask(),
    execShareTask: terminal => terminal.room.share.execShareTask(terminal),
    onCanProvideResource: (room, resType) => room.share.becomeSource(resType),
    getMineral,
    getResource: (room, resType) => {
        const { total } = room.storageController.getResource(resType)
        return total
    },
    scanState: terminal => setRoomStats(terminal.room.name, () => {
        return { power: terminal.store[RESOURCE_POWER] }
    }),
    env: createEnvContext('terminal')
})
