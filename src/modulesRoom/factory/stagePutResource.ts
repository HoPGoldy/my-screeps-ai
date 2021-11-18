import { setRoomStats } from "@/modulesGlobal/stats"
import { TransportTaskType } from '../taskTransport/types'
import FactoryBase from "./base"
import { FactoryState } from "./constant"

/**
 * 移出资源阶段
 * 将自己存储里的所有资源都移动到其他建筑里
 */
export default class StagePutResource extends FactoryBase {
    constructor(roomName: string) {
        super(roomName)
    }

    public run(): void {
        if (Game.time % 5 || this.room.transport.hasTaskWithType(TransportTaskType.FactoryPutResource)) return 

        const task = this.getCurrentTask()
        // 一般到这一步是不会产生没有任务的问题
        if (!task) return this.setState(FactoryState.Prepare)

        // 把所有东西都搬出去，保持工厂存储净空
        const requests = Object.keys(this.factory.store).map((resType: ResourceConstant) => {
            // 是目标产物的话就更新统计信息
            if (resType === task.target) this.updateStats(resType)

            const target = resType === RESOURCE_ENERGY ? this.room.storage : this.room.terminal
            return { from: this.factory.id, to: target.id, resType, amount: this.factory.store[resType] }
        })

        if (requests.length > 0) {
            this.room.transport.addTask({
                type: TransportTaskType.FactoryPutResource,
                requests
            })
            return
        }

        // 能到这里说明产物都转移完成，移除已完成任务并重新开始准备阶段
        // 这里没有检查目标产物数量是否足够就直接移除任务
        // 原因是后面合成高级任务的时候如果发现材料不足就会自动发布数量合适的新任务
        // 所以没必要在这里增加代码复杂度
        this.deleteCurrentTask()
        this.setState(FactoryState.Prepare)
    }

    /**
     * 更新对应产物的统计信息
     * 会将刚刚造出来的产物和 terminal 已经存在的产物数量加起来更新到 stats 中
     * 
     * @param res 要更新数量的资源
     */
    private updateStats(res: ResourceConstant) {
        setRoomStats(this.roomName, () => ({
            [res]: (this.factory.store[res] + this.room.terminal?.store[res]) || 0
        }))
    }
}