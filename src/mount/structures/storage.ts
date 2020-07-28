import { ENERGY_SHARE_LIMIT } from "setting"

/**
 * Storage 拓展
 * 
 * storage 会对自己中的能量进行监控，如果大于指定量（ENERGY_SHARE_LIMIT）的话
 * 就将自己注册到资源来源表中为其他房间提供能量
 */
export default class StorageExtension extends StructureStorage {
    public work(): void {
        this.stateScanner()

        if (Game.time % 10000) return
        // 定时运行规划
        this.room.releaseCreep('upgrader')
        // 能量太多就提供资源共享
        if (this.store[RESOURCE_ENERGY] >= ENERGY_SHARE_LIMIT) this.room.shareAddSource(RESOURCE_ENERGY)
    }

    /**
     * 统计自己存储中的剩余能量
     */
    private stateScanner(): void {
        if (Game.time % 20) return
        if (!Memory.stats.rooms[this.room.name]) Memory.stats.rooms[this.room.name] = {}

        Memory.stats.rooms[this.room.name].energy = this.store[RESOURCE_ENERGY]
    }

    /**
     * 建筑完成时以自己为中心发布新的 creep 运维组
     */
    public onBuildComplete(): void {
        this.room.releaseCreep('harvester')
        this.room.releaseCreep('manager')
        this.room.releaseCreep('upgrader')
    }
}