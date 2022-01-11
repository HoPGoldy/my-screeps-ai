import { TransportTaskType } from '@/modulesRoom'
import { createEnvContext } from '@/utils'
import { getFactory } from './shortcut'
import { FactoryMemory, FactoryTransportType, createFactoryController, FactoryLevel } from '@/modulesRoom/factory'
import { setRoomStats } from '@/modulesGlobal/stats'

declare global {
    interface RoomMemory {
        factory: FactoryMemory
    }

    interface Memory {
        /**
         * 商品生产线配置
         * 键为工厂等级，值为被设置成对应等级的工厂所在房间名
         */
        commodities: {
            [level in FactoryLevel]?: string[]
        }
    }
}

/**
 * 把 factory 的物流任务类型映射到物流模块的任务类型
 */
const TypeMapping = {
    [FactoryTransportType.GetResource]: TransportTaskType.FactoryGetResource,
    [FactoryTransportType.PutResource]: TransportTaskType.FactoryPutResource
}

export const { getFactoryController, showGlobal } = createFactoryController({
    getMemory: room => {
        if (!room.memory.factory) room.memory.factory = {}
        return room.memory.factory
    },
    getGlobalMemory: () => {
        if (!Memory.commodities) Memory.commodities = {}
        return Memory.commodities
    },
    getRoomShareTask: room => room.share.getShareTask(),
    requestShare: (room, resType, amount) => room.share.request(resType, amount),
    hasTransportTask: (room, type) => room.transport.hasTaskWithType(TypeMapping[type]),
    addTransportTask: (room, type, requests) => room.transport.addTask({
        type: TypeMapping[type],
        requests
    }),
    getFactory,
    getResourceAmount: (room, resType) => {
        const { total } = room.storageController.getResource(resType)
        return total
    },
    getResourceStorePlace: (room, resType, amount) => {
        return room.storageController.getResourcePlace(resType, amount)
    },
    onCanProvideResource: () => {},
    onCantProvideResource: () => {},
    onFinishProduce: (room, resType, amount) => {
        // 更新对应产物的统计信息
        // 会将刚刚造出来的产物和 terminal 已经存在的产物数量加起来更新到 stats 中
        setRoomStats(room.name, () => ({
            [resType]: (amount + room.terminal?.store[resType]) || 0
        }))
    },
    requestPowerFactory: room => room.power.addTask(PWR_OPERATE_FACTORY),
    env: createEnvContext('factory')
})
