import { createCache } from "@/utils"
import { RoomInfo } from "../types"

/**
 * 创建获取房间单位信息功能
 * 用于管理本 tick 的房间搜索信息缓存
 */
export const useCollectRoomInfo = function (getRoomByName: (roomName: string) => Room) {
    const collectRoomInfo = function (roomName: string): RoomInfo | undefined {
        const room = getRoomByName(roomName)
        if (!room) return undefined

        // 查询基础信息
        const hostileCreeps = room.find(FIND_HOSTILE_CREEPS)
        const hostilePowerCreeps = room.find(FIND_HOSTILE_POWER_CREEPS)
        const hostileSite = room.find(FIND_HOSTILE_CONSTRUCTION_SITES)
        const myCreeps = room.find(FIND_MY_CREEPS)
        const myPowerCreeps = room.find(FIND_MY_POWER_CREEPS)
        const structures = room.find(FIND_STRUCTURES)

        // 对建筑进行分类
        const structureGroup = _.groupBy(structures, s => s.structureType)

        const defaultStructures = {
            [STRUCTURE_CONTROLLER]: [], [STRUCTURE_EXTENSION]: [], [STRUCTURE_EXTRACTOR]: [], [STRUCTURE_FACTORY]: [], [STRUCTURE_INVADER_CORE]: [],
            [STRUCTURE_KEEPER_LAIR]: [], [STRUCTURE_LAB]: [], [STRUCTURE_LINK]: [], [STRUCTURE_NUKER]: [], [STRUCTURE_OBSERVER]: [],
            [STRUCTURE_POWER_SPAWN]: [], [STRUCTURE_POWER_BANK]: [], [STRUCTURE_RAMPART]: [], [STRUCTURE_SPAWN]: [], [STRUCTURE_STORAGE]: [],
            [STRUCTURE_TERMINAL]: [], [STRUCTURE_TOWER]: [], [STRUCTURE_CONTAINER]: [], [STRUCTURE_PORTAL]: [], [STRUCTURE_ROAD]: [], [STRUCTURE_WALL]: [],
        }

        return {
            ...defaultStructures,
            ...structureGroup,
            structures,
            hostileCreeps,
            hostilePowerCreeps,
            hostileSite,
            myCreeps,
            myPowerCreeps
        }
    }

    return createCache(collectRoomInfo)
}