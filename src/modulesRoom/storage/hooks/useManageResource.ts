import { ENERGY_REQUEST_LIMIT, ENERGY_SHARE_LIMIT } from '../constant'
import { ResourceAmount, StorageContext } from '../types'

export const useManageResource = function (roomName: string, context: StorageContext) {
    const { env, requestShareRoom, addPowerStroageTask, canShareEnergy } = context

    /**
     * 查询房间内指定资源的数量
     * 目前会检查 storage 和 terminal 的 storage
     *
     * @param resourceType 要查询的资源
     */
    const getResource = function (res: ResourceConstant): ResourceAmount {
        const room = env.getRoomByName(roomName)

        const storageAmount = room.storage?.store[res] || 0
        const terminalAmount = room.terminal?.store[res] || 0

        return {
            total: storageAmount + terminalAmount,
            storage: storageAmount,
            terminal: terminalAmount
        }
    }

    /**
     * 获取一个资源应该去哪里取
     * 向这个方法传入资源和数量，会返回应该去 storage 还是 terminal 里取
     *
     * @param res 要获取的资源
     * @param amount 资源类型
     */
    const getResourcePlace = function (res: ResourceConstant, amount = 1): StructureTerminal | StructureStorage | undefined {
        const room = env.getRoomByName(roomName)

        // 优先取用 storage 里的
        const storageAmount = room.storage?.store[res] || 0
        if (storageAmount >= amount) return room.storage

        const terminalAmount = room.terminal?.store[res] || 0
        if (terminalAmount === 0 && storageAmount === 0) return undefined

        // storage 里的资源不足的话就挑哪个的资源多
        return terminalAmount > storageAmount ? room.terminal : room.storage
    }

    /**
     * 获取一个资源应该存放在哪里
     */
    const getStorePlace = function (res: ResourceConstant): StructureTerminal | StructureStorage | undefined {
        const room = env.getRoomByName(roomName)

        if (!room.terminal) return room.storage
        if (!room.storage) return room.terminal

        return room.storage.store.getFreeCapacity() > room.terminal.store.getFreeCapacity() ? room.storage : room.terminal
    }

    return { getStorePlace, getResourcePlace, getResource }
}
