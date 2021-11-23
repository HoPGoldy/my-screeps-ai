import { createCache } from '@/utils'
import { RoomInfo } from '../../types'

/**
 * 创建获取房间 cost 功能
 * 用于管理本 tick 所有的基础房间 cost 缓存
 */
export const useGetRoomCostMatrix = function (getRoomInfo: (roomName: string) => RoomInfo | undefined) {
    const createRoomBaseCostMatrix = function (roomName: string): CostMatrix | undefined {
        const roomInfo = getRoomInfo(roomName)
        if (!roomInfo) return undefined
        const { hostileCreeps, hostilePowerCreeps, myCreeps, myPowerCreeps, structures, road, constructedWall, rampart } = roomInfo

        const costs = new PathFinder.CostMatrix()

        // 设置路的 cost
        road.map(r => costs.set(r.pos.x, r.pos.y, 1));

        // 设置墙壁 cost
        [...constructedWall, ...rampart].forEach(wall => {
            if (wall.my) return
            costs.set(wall.pos.x, wall.pos.y, getCostByHits(wall.hits))
        });

        // 把所有爬都设置为几乎不可通行
        [...hostileCreeps, ...hostilePowerCreeps, ...myCreeps, ...myPowerCreeps].forEach(creep => {
            costs.set(creep.pos.x, creep.pos.y, 254)
        })

        // 所有其他走不了的建筑都设置成几乎不可通行
        // 虽然可以暴力碾过去，但是对于四人小队之类的还是要设置这个 cost，不然会出现拌倒一个建筑然后小队脱节的情况
        const alreadyCalcType: string[] = [STRUCTURE_ROAD, STRUCTURE_CONTAINER, STRUCTURE_RAMPART, STRUCTURE_WALL]
        structures.forEach(s => {
            if (alreadyCalcType.includes(s.structureType)) return
            costs.set(s.pos.x, s.pos.y, 254)
        })

        return costs
    }

    return createCache(createRoomBaseCostMatrix)
}

/**
 * 将墙壁生命值转换为 cost
 * 5cost 起步，每多 1M 血量增加 1cost
 *
 * @param hits 墙壁生命值
 */
const getCostByHits = function (hits: number): number {
    const coefficient = Math.ceil(hits / 1000000)
    const cost = coefficient * 5

    return cost > 254 ? 254 : cost
}
