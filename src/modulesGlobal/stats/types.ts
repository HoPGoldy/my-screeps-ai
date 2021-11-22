export interface StatsMemory {
    /**
     * GCl/GPL 升级百分比
     */
    gcl?: number
    gclLevel?: number
    gpl?: number
    gplLevel?: number
    /**
     * CPU 当前数值及百分比
     */
    cpu?: number
    /**
     * bucket 当前数值
     */
    bucket?: number
    /**
     * 当前还有多少钱
     */
    credit?: number

    /**
    * 房间内的数据统计
    */
    rooms: {
        [roomName: string]: RoomStats
    }
}

/**
 * 房间的统计数据
 */
export interface RoomStats {
    /**
     * 终端中的 power 数量
     */
    power?: number
    /**
     * nuker 的资源存储量
     */
    nukerEnergy?: number
    nukerG?: number
    nukerCooldown?: number
    /**
     * 控制器升级进度，只包含没有到 8 级的
     */
    controllerRatio?: number
    controllerLevel?: number
    /**
     * 其他种类的资源数量，由 factory 统计
     */
    [commRes: string]: number
    /**
     * 本房间的总可用能量（包括 storage、terminal、container）
     */
    totalEnergy?: number
    /**
     * totalEnergy 统计时的 Game.time，用于计算下面的获取速率
     */
    energyCalcTime?: number
    /**
     * 能量获取速率
     * 例如 100 代表 100 点能量/tick，值为负代表负增长
     */
    energyGetRate?: number
}

declare global {
    interface Memory {
        /**
         * 全局统计信息
         */
        stats: StatsMemory
    }
}