/**
 * 外矿配置信息
 */
export interface RemoteInfo {
    /**
     * 该外矿什么时候可以恢复采集，在被入侵时触发
     */
    reharvestTick?: number
    /**
     * 该外矿要把能量运到哪个建筑里，保存下来是为了后面方便自动恢复外矿采集
     */
    targetId?: Id<StructureWithStore>
}

/**
 * 外矿全量信息
 */
export type RemoteShowInfo = {
    /**
     * 外矿所在房间名
     */
    remoteRoomName: string
    /**
     * 要采集的外矿 id
     */
    sourceId: Id<Source>
} & RemoteInfo

export interface RemoteMemory {
    /**
     * 外矿房间名
     */
    [roomName: string]: {
        /**
         * 具体要采集的 source
         */
        [sourceId: string]: RemoteInfo
    }
}

declare global {
    interface RoomMemory {
        remote?: RemoteMemory
    }
}