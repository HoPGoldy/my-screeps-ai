/**
 * 地图库实例
 * 位于全局
 */
export interface MapLibrary {
    /**
     * 房间名
     * 数据以房间为单位进行保存
     */
    [roomName: string]: {
        /**
         * 原始数据
         * 在初始化时压缩数据会被加载到这里，并不会直接解析为真正对象
         */
        raw: string
        /**
         * 实际的地图数据
         * 在第一次访问时懒加载
         */
        data?: LibRoomDetail
    }
}

/**
 * 房间数据
 * 分为压缩版（T 为 string）和完全版（T 为 RoomPosition）
 */
export type LibRoomDetail<T extends RoomPosition | string = RoomPosition> = {
    /**
     * 房间中的一些常规位置
     */
    [item in RecordRoomItem]: T[]
} & {
    /**
     * 该房间中的建筑对象
     */
    structure: {
        /**
         * 每种建筑类型都对应了一个位置数组
         */
        [type in StructureConstant]?: T[]
    }
    /**
     * 该房间的 controller 位置
     */
    controller?: T
    /**
     * 该房间的所属玩家名
     */
    player?: string
    /**
     * 记录时该房间的 RCL
     */
    rcl: AllRoomControlLevel
    /**
     * 对该房间的评价
     */
    appraisal: AppraisalTypes
    /**
     * 该数据的记录时间
     */
    time: number
}

/**
 * 对房间的评价
 *
 * - safety：安全，可以同行
 * - danger：危险，不可以通行
 */
export type AppraisalTypes = 'safety' | 'danger'

/**
 * 需要记录的房间常规位置
 */
export type RecordRoomItem = 'source' | 'mineral' | 'site'

declare global {
    interface Game {
        /**
         * 本 tick 是否有数据需要进行保存
         */
        _needSaveMapLibrary: true
    }
}
