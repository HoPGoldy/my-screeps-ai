import { setRoomStats } from '@/modulesGlobal/stats'
import { TransportTaskType } from '@/modulesRoom'

// nuker 拓展
export default class NukerExtension extends StructureNuker {
    public onWork (): void {
        this.stateScanner()

        if (Game.time % 30) return

        // 能量不满并且 storage 能量大于 300k 则开始填充能量
        if (!this.keepResource(RESOURCE_ENERGY, NUKER_ENERGY_CAPACITY, 300000, 500)) return
        // G 矿不满并且 terminal 中有 G 矿则开始填充 G
        this.keepResource(RESOURCE_GHODIUM, NUKER_GHODIUM_CAPACITY, 0, 100)
    }

    /**
     * 将自身存储的资源维持在指定容量之上
     *
     * @param resource 要检查的资源
     * @param needFillLimit 当资源余量少于该值时会发布搬运任务
     * @param sourceLimit 资源来源建筑中剩余目标资源最小值（低于该值将不会发布资源获取任务）
     * @param amount 要转移的话每次转移多少数量
     * @returns 该资源是否足够
     */
    private keepResource (resType: ResourceConstant, needFillLimit: number, sourceLimit: number, amount: number): boolean {
        if (this.store[resType] >= needFillLimit) return true

        const { total } = this.room.myStorage.getResource(resType)

        if (total > sourceLimit &&
            !this.room.transport.hasTaskWithType(TransportTaskType.FillNuker)
        ) {
            this.room.transport.addTask({
                type: TransportTaskType.FillNuker,
                requests: [{ resType, amount: Math.min(amount, total), to: this.id }]
            })
        }

        return false
    }

    /**
     * 统计自己存储中的资源数量
     */
    private stateScanner (): void {
        if (Game.time % 20) return
        setRoomStats(this.room.name, () => ({
            nukerEnergy: this.store[RESOURCE_ENERGY],
            nukerG: this.store[RESOURCE_GHODIUM],
            nukerCooldown: this.cooldown
        }))
    }
}
