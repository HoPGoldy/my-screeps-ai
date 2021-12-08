import { ENERGY_REQUEST_LIMIT, ENERGY_SHARE_LIMIT } from '../constant'
import { StorageContext } from '../types'

export const useStorageWork = function (roomName: string, context: StorageContext) {
    const { env, requestShareRoom, addPowerStroageTask, canShareEnergy } = context

    const run = function () {
        const room = env.getRoomByName(roomName)

        if (!room.storage) return
        if (env.inInterval(900)) return
        requestEnergyCheck(room)
        requestPower(room)

        if (env.inInterval(9000)) return
        shareEnergyCheck(room)
    }

    /**
     * 检查是否需要请求能量支援
     */
    const requestEnergyCheck = function (room: Room) {
        const energyAmount = room.storage.store[RESOURCE_ENERGY]

        // 能量太少了，请求资源共享
        if (energyAmount >= ENERGY_REQUEST_LIMIT || !room.terminal) return
        const helpRoom = requestShareRoom(room, RESOURCE_ENERGY, ENERGY_REQUEST_LIMIT - energyAmount)
        if (!helpRoom) {
            // 控制的房间多了才会打印这个 log，不然也挺烦的
            if (Object.keys(env.getGame().spawns).length > 3) {
                env.log.normal(`能量过低（${energyAmount}），但未找到可以提供支援的房间`)
            }
            return
        }

        env.log.normal(
            `能量过低（剩余：${energyAmount}），将接受 ${helpRoom.name} 的能量支援` +
            `（共享数量：${ENERGY_REQUEST_LIMIT - energyAmount}）`
        )
    }

    /**
     * 检查是否需要 power 强化
     */
    const requestPower = function (room: Room) {
        // 存储还够或者房间没有开启 power 就不发布强化任务
        if (
            room.storage.store.getFreeCapacity() > 50000 ||
            !room.controller.isPowerEnabled
        ) return

        addPowerStroageTask(room)
    }

    /**
     * 检查是否可以提供能量支援
     */
    const shareEnergyCheck = function (room: Room) {
        const energyAmount = room.storage.store[RESOURCE_ENERGY]

        // 能量太多就提供资源共享
        // 这里不会移除共享，share 模块会在本房间能量不足时自动移除
        if (energyAmount >= ENERGY_SHARE_LIMIT) canShareEnergy(room)
    }

    return { run, requestEnergyCheck }
}
