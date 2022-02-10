interface FlagMemory {
    /**
     * 因为外矿房间有可能没视野
     * 所以把房间名缓存进内存
     */
    roomName?: string
    /**
     * 路径点旗帜中生效
     * 用于指定下一个路径点的旗帜名
     */
    next: string
}
