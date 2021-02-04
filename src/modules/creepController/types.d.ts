interface Room {
    /**
     * creep 发布
     */
    release: InterfaceCreepRelease
}

interface InterfaceCreepRelease {
    /**
     * 发布采集单位
     */
    harvester(): OK | ERR_NOT_FOUND
    /**
     * 变更运营单位数量
     * 工作单位 / 搬运单位
     */
    changeBaseUnit(type: 'worker' | 'manager', adjust: number, bodyType?: SepicalBodyType): OK | ERR_NOT_FOUND | ERR_INVALID_TARGET
    /**
     * 发布中央运输单位
     */
    processor(): OK | ERR_NOT_FOUND
    /**
     * 发布外矿角色组
     */
    remoteCreepGroup(remoteRoomName: string): OK | ERR_NOT_FOUND
    /**
     * 发布房间预定者
     */
    remoteReserver(remoteRoomName: string, single?: boolean): void
    /**
     * 给本房间签名
     */
    sign(content: string, targetRoomName?: string)
    /**
    * 发布支援角色组
    */
    remoteHelper(remoteRoomName: string): void
    /**
     * 孵化 pbCarrier 小组
     */
    pbCarrierGroup(flagName: string, number: number): void
    /**
     * 孵化 pb 采集小组（一红一绿为一组）
     */
    pbHarvesteGroup(targetFlagName: string, groupNumber?: number): void
    /**
     * 移除 pb 采集小组配置项
     */
    removePbHarvesteGroup(attackerName: string, healerName: string): void
    /**
     * 孵化 deposit 采集单位
     */
    depositHarvester(targetFlagName: string): void
    /**
     * 孵化 boost 进攻一体机
     */
    rangedAttacker(bearTowerNum?: 0 | 1 | 3 | 5 | 2 | 4 | 6, targetFlagName?: string, keepSpawn?: boolean): string
    /**
     * 孵化 boost 拆墙小组
     */
    dismantleGroup(targetFlagName?: string, keepSpawn?: boolean): string
    /**
     * 孵化基础进攻单位
     */
    soldier(targetFlagName?: string, num?: number): string
    /**
     * 孵化基础拆除单位
     * 一般用于清除中立房间中挡路的墙壁
     */
    dismantler(targetFlagName?: string, num?: number, keepSpawn?: boolean): string
    /**
     * 孵化掠夺者
     */
    reiver(sourceFlagName?: string, targetStructureId?: Id<StructureWithStore>): string
}

interface Memory {
    /**
     * 所有 creep 的配置项，每次 creep 死亡或者新增时都会通过这个表来完成初始化
     */
    creepConfigs: {
        [creepName: string]: CreepConfigMemory
    }
}