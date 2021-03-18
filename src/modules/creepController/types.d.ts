interface Memory {
    /**
     * 所有 creep 的配置项，每次 creep 死亡或者新增时都会通过这个表来完成初始化
     */
    creepConfigs: {
        [creepName: string]: CreepConfigMemory
    }
}