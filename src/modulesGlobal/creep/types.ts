interface CreepMemory {
    /**
     * 是否禁止重新孵化
     */
    cantRespawn?: boolean
    /**
     * 孵化该 creep 的房间
     */
    spawnRoom: string
}

interface Memory {
    /**
     * 所有等待孵化的 creep
     * 键为 creep 名称，值为执行孵化的房间名
     */
    waitSpawnCreeps: {
        [creepName: string]: string
    }
}
