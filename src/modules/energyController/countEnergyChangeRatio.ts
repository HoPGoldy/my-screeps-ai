import { setRoomStats } from 'modules/stats'

/**
 * 统计指定房间的能量状态（包括可用能量总量、能量获取速率
 * ）
 * @param roomName 要统计的房间名
 * @returns ERR_NOT_FOUND 找不到指定房间
 */
export const countEnergyChangeRatio = function (roomName: string): OK | ERR_NOT_FOUND {
    const room = Game.rooms[roomName]
    if (!room) return ERR_NOT_FOUND

    setRoomStats(roomName, oldStats => {
        // 计算房间内的可用总能量
        const totalEnergy = _.reduce<Store<ResourceConstant, false>, number>(
            // 拿到需要进行统计的 store
            [room.terminal?.store, room.storage?.store, ...room[STRUCTURE_CONTAINER].map(c => c.store)].filter(Boolean),
            // 计算 store 中的能量总数
            (pre, next) => (pre[RESOURCE_ENERGY] || 0) + (next[RESOURCE_ENERGY] || 0)
        )

        // 计算能量获取速率，如果 energyGetRate 为 NaN 的话代表之前还未进行过统计，先设置为 0
        const energyGetRate = _.isNaN(oldStats.energyGetRate) ? 0
            : (totalEnergy - oldStats.totalEnergy) / (Game.time - oldStats.energyCalcTime)

        return {
            totalEnergy,
            energyGetRate,
            energyCalcTime: Game.time
        }
    })
    return OK   
}