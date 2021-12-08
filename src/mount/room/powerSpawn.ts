import { TransportTaskType } from '@/modulesRoom'
import { createCache, createEnvContext, createHelp } from '@/utils'
import { PowerSpawnMemory } from '@/modulesRoom/powerSpawn/types'
import { createPowerSpawnController } from '@/modulesRoom/powerSpawn/powerSpawnController'

declare global {
    interface RoomMemory {
        ps: PowerSpawnMemory
    }
}

const { lazyLoader: lasyLoadPowerSpawn } = createPowerSpawnController({
    getMemory: room => {
        if (!room.memory.ps) room.memory.ps = {}
        return room.memory.ps
    },
    getRoomPowerSpawn: room => room[STRUCTURE_POWER_SPAWN],
    getResAmount: (room, resType) => {
        const { total } = room.myStorage.getResource(resType)
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

export const [getPsController] = createCache(lasyLoadPowerSpawn)

export class PowerSpawnConsole extends Room {
    public pon () {
        return this.psController.on()
    }

    public poff () {
        return this.psController.off()
    }

    public pshow () {
        return this.psController.show()
    }

    public phelp (): string {
        return createHelp({
            name: 'PowerSpawn 控制台',
            describe: 'ps 默认启用，会自动处理房间中的能量和 power。',
            api: [
                {
                    title: '启动/恢复处理 power',
                    functionName: 'pon'
                },
                {
                    title: '暂停处理 power',
                    functionName: 'poff'
                },
                {
                    title: '查看当前状态',
                    functionName: 'pshow'
                }
            ]
        })
    }
}
