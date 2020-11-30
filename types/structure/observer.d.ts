interface ObserverMemory {
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
     * 当前已经找到的 powerBank 和 deposit 旗帜名数组，会自动进行检查来移除消失的旗帜信息
     */
    pbList: string[]
    depoList: string[]
    /**
     * 是否暂停，为 true 时暂停
     */
    pause?: boolean
}

interface StructureObserver {
    updateFlagList(): OK | ERR_NOT_FOUND
}