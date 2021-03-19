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