import { setRoomStats } from 'modules/stats'

/**
 * 统计指定房间的能量状态（包括可用能量总量、能量获取速率
 * ）
 * @param room 要统计的房间
 * @returns ERR_NOT_FOUND 找不到指定房间
 */
export const countEnergyChangeRatio = function (room: Room): OK | ERR_NOT_FOUND {
    setRoomStats(room.name, oldStats => {
        // 收集房间建筑内的可用总能量
        const structureEnergy = [room.terminal, room.storage, ...room[STRUCTURE_CONTAINER]]
            .filter(Boolean)
            // 拿到需要进行统计的能量数量
            .map(c => c.store[RESOURCE_ENERGY] || 0)

        // 收集地上的能量
        const droppedEnergy = room.source
            .map(s => s.getDroppedInfo().energy)
            .filter(Boolean)
            .map(energy => energy.amount)

        // 计算能量总数
        const totalEnergy = [ ...structureEnergy, ...droppedEnergy ].reduce((pre, next) => pre + next, 0)

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