import { createCache } from "@/utils"
import { RoomInfo } from "../types"

/**
 * 创建获取房间 cost 功能
 * 用于管理本 tick 所有的基础房间 cost 缓存
 */
export const useGetRoomCostMatrix = function (getRoomInfo: (roomName: string) => RoomInfo | undefined) {
    const createRoomBaseCostMatrix = function (roomName: string): CostMatrix | undefined {
        const roomInfo = getRoomInfo(roomName)
        if (!roomInfo) return undefined
        const { hostileCreeps, hostilePowerCreeps, myCreeps, myPowerCreeps, road, constructedWall, rampart } = roomInfo

        const costs = new PathFinder.CostMatrix;

        // 把所有爬都设置为不可通行
        [...hostileCreeps, ...hostilePowerCreeps, ...myCreeps, ...myPowerCreeps].map(creep => {
            costs.set(creep.pos.x, creep.pos.y, 255)
        });
        // 设置墙壁 cost
        [...constructedWall, ...rampart].map(wall => {
            costs.set(wall.pos.x, wall.pos.y, getCostByHits(wall.hits))
        });
        // 设置路的 cost
        road.map(r => costs.set(r.pos.x, r.pos.y, 1))

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
    let cost = coefficient * 5

    return cost > 254 ? 254 : cost
}