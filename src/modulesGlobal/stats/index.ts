/**
 * 更新指定房间的统计数据
 * 
 * @param roomName 要保持
 * @param getNewStats 统计数据的获取回调，该方法提供房间现存的状态作为参数，且返回的值将被合并到房间的统计数据中
 */
export const setRoomStats = function (roomName: string, getNewStats: (stats: RoomStats) => Partial<RoomStats>): void {
    if (!Memory.stats) Memory.stats = { rooms: {} }

    if (!Memory.stats.rooms[roomName]) {
        Memory.stats.rooms[roomName] = {
            power: 0,
            nukerEnergy: 0,
            nukerG: 0,
            nukerCooldown: 0,
            controllerRatio: 0,
            controllerLevel: 0,
            totalEnergy: 0,
            energyCalcTime: 0,
            energyGetRate: NaN
        }
    }

    _.assign(Memory.stats.rooms[roomName], getNewStats(Memory.stats.rooms[roomName]))
}

/**
 * 清理指定房间的统计数据
 * 
 * @param roomName 要清理统计的房间名
 */
export const clearRoomStats = function (roomName: string): void {
    delete Memory.stats.rooms[roomName]
}

/**
 * 获取指定房间的统计数据
 * 
 * @param roomName 要获取统计的房间名
 */
export const getRoomStats = function (roomName: string): RoomStats {
    return Memory.stats.rooms[roomName] || {}
}

/**
 * 初始化全局存储
 * 每次 global 重置后
 */
export const initGlobalStats = function (): void {
    if (!Memory.stats) Memory.stats = { rooms: {} }
}

/**
 * 全局统计信息扫描器
 * 负责搜集关于 cpu、memory、GCL、GPL 的相关信息
 * 详情见 ./doc/Grafana 统计信息.md
 */
export const stateScanner = function (): void {
    if (Game.time % 20) return 
    
    // 统计 GCL / GPL 的升级百分比和等级
    Memory.stats.gcl = (Game.gcl.progress / Game.gcl.progressTotal) * 100,
    Memory.stats.gclLevel = Game.gcl.level,
    Memory.stats.gpl = (Game.gpl.progress / Game.gpl.progressTotal) * 100,
    Memory.stats.gplLevel = Game.gpl.level,
    // CPU 的当前使用量
    Memory.stats.cpu = Game.cpu.getUsed(),
    // bucket 当前剩余量
    Memory.stats.bucket = Game.cpu.bucket
    // 统计剩余钱数
    Memory.stats.credit = Game.market.credits
}

/**
 * 生成状态统计模块的框架插件
 */
export const stateScannerAppPlugin: AppLifecycleCallbacks = {
    reset: initGlobalStats,
    tickEnd: stateScanner
}