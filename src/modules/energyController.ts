/**
 * 房间内的能量管理模块，提供以下功能：
 * - 统计能量相关数据 countEnergyChangeRatio：该方法应定期调用
 * - 获取当前房间中最合适的能量来源 getAvailableSource：该方法应由需要能量的 creep 调用
 * 
 * 该模块依赖于 shortcut 和 stateCollector 模块
 */

import { setRoomStats } from './stateCollector'

/**
 * getAvailableSource 中，建筑存储中能量大于多少才会被当作目标
 */
const ENERGY_USE_LIMIT = {
    TERMINAL: 10000,
    STORAGE: 100000,
    CONTAINER: 300
}

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

/**
 * 获取房间可用能量来源的配置项
 */
interface GetAvailableSourceOpt<DefaultIncludeSource extends boolean = boolean> {
    /**
     * 是否包含 Source，默认为 false
     */
    includeSource?: DefaultIncludeSource
    /**
     * 是否无视能量获取限制，默认为 false
     * 开启后会变得更“贪婪”，spawn 填充工人可以开启该设置，而 worker 推荐不开启（防止抢夺填充所需的能量）
     */
    ignoreLimit?: boolean
}

/**
 * 在指定房间搜索可用的能量来源1
 * 
 * 搜索参数：
 * - includeSource 【可选】是否包含 source，默认为 true
 * - ignoreLimit 【可选】是否无视能量获取限制，默认为 false
 * 
 * @param roomName 要查询的房间
 * @param opt 搜索项
 * @returns 当前应该从哪里获取能量
 */
function getAvailableSource(room: Room, opt?: GetAvailableSourceOpt<true>): AllEnergySource
function getAvailableSource(room: Room, opt?: GetAvailableSourceOpt<false>): EnergySourceStructure
function getAvailableSource(room: Room, opt: GetAvailableSourceOpt = { includeSource: true, ignoreLimit: false }): AllEnergySource {
    // terminal 或 storage 里有能量就优先用
    if (room.terminal) {
        const useLimit = opt.ignoreLimit ? 0 : ENERGY_USE_LIMIT.TERMINAL
        if (room.terminal.store[RESOURCE_ENERGY] > useLimit) return room.terminal
    }
    if (room.storage) {
        const useLimit = opt.ignoreLimit ? 0 : ENERGY_USE_LIMIT.STORAGE
        if (room.storage.store[RESOURCE_ENERGY] > useLimit) return room.storage
    }
    // 如果有 container
    if (room[STRUCTURE_CONTAINER].length > 0) {
        const useLimit = opt.ignoreLimit ? 0 : ENERGY_USE_LIMIT.CONTAINER
        // 能量必须够多才会选用
        const availableContainer = room[STRUCTURE_CONTAINER].filter(container => container.store[RESOURCE_ENERGY] > useLimit)
        // 挑个能量多的 container
        if (availableContainer.length > 0) return _.max(availableContainer, container => container.store[RESOURCE_ENERGY])
    }

    // 没有就选边上有空位的 source
    return opt.includeSource ? room.source.find(source => {
        const freeCount = source.pos.getFreeSpace().length
        const harvestCount = source.pos.findInRange(FIND_CREEPS, 1).length

        return freeCount - harvestCount > 0
    }) : undefined
}

export const getRoomAvailableSource = getAvailableSource