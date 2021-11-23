export interface ObserverMemory {
    /**
     * 上个 tick 已经 ob 过的房间名
     */
    checkRoomName?: string
    /**
     * 遍历 watchRooms 所使用的索引
     */
    watchIndex: number
    /**
     * 监听的房间列表
     */
    watchRooms: string[]
    /**
     * 当前正在采集的 powerBank 旗帜名数组
     */
    pbList: string[]
    /**
     * 当前正在采集的 depo 旗帜名数组
     */
    depoList: string[]
    /**
     * 是否暂停，为 true 时暂停
     */
    pause?: boolean
}

declare global {
    interface RoomMemory {
        /**
         * 终端内存
         */
        observer?: ObserverMemory
    }
}
