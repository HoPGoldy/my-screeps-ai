import { setRoomStats } from '@/modulesGlobal/stats'
import { ENERGY_USE_LIMIT } from './findStrategy'

/**
 * 统计指定房间的能量状态（包括可用能量总量、能量获取速率）
 *
 * @param room 要统计的房间
 * @param withLimit 是否剔除需要保留的能量（用在孵化上的能量）
 * @returns 该房间的能量获取速率，单位（点/tick）
 */
export const countEnergyChangeRatio = function (room: Room, withLimit = false) {
    // 收集房间建筑内的可用总能量
    const structureEnergy = [room.terminal, room.storage, ...room[STRUCTURE_CONTAINER]]
        .filter(Boolean)
        // 拿到需要进行统计的能量数量
        .map(structure => {
            const energyAmount = structure.store[RESOURCE_ENERGY] || 0
            // 如果使用限制的话，就剔除对应的能量数量
            if (withLimit) {
                const amountWithLimit = energyAmount - ENERGY_USE_LIMIT[structure.structureType]
                // 现有能量低于标准，相当于该容器没有能量可用
                return amountWithLimit <= 0 ? 0 : amountWithLimit
            }
            return energyAmount
        })

    // 收集地上的能量
    const droppedEnergy = room.source
        .map(s => s.getDroppedInfo().energy)
        .filter(Boolean)
        .map(energy => {
            if (withLimit) {
                const amountWithLimit = energy.amount - ENERGY_USE_LIMIT[RESOURCE_ENERGY]
                return amountWithLimit <= 0 ? 0 : amountWithLimit
            }
            return energy.amount
        })

    // 计算能量总数
    const totalEnergy = [...structureEnergy, ...droppedEnergy].reduce((pre, next) => pre + next, 0)

    let energyGetRate: number
    setRoomStats(room.name, oldStats => {
        // 计算能量获取速率，如果 energyGetRate 为 NaN 的话代表之前还未进行过统计，先设置为 0
        energyGetRate = _.isNaN(oldStats.energyGetRate)
            ? 0
            : (totalEnergy - oldStats.totalEnergy) / (Game.time - oldStats.energyCalcTime)

        return {
            totalEnergy,
            energyGetRate,
            energyCalcTime: Game.time
        }
    })

    return { totalEnergy, energyGetRate }
}
