import { TransportTaskType } from '../taskTransport/types'
import FactoryBase from "./base"
import { ENERGY_LIMIT, FactoryState } from "./constant"

/**
 * 获取资源
 * 会从其他建筑里获取资源填充到自己存储
 */
export default class StageGetResource extends FactoryBase {
    constructor(roomName: string) {
        super(roomName)
    }

    public run(): void {
        if (Game.time % 5 || this.room.transport.hasTaskWithType(TransportTaskType.FactoryGetResource)) return 

        const task = this.getCurrentTask()
        // 一般到这一步是不会产生没有任务的问题
        if (!task) return this.setState(FactoryState.Prepare)

        // 遍历所有的底物，检查存放的是否充足
        // 自己存放的不足就发布转移任务
        const subResources = COMMODITIES[task.target].components
        for (const resType in subResources) {
            // 资源已经够了就不必发布任务
            if (this.factory.store[resType] >= subResources[resType]) continue

            // 合成任务需要的该材料数量
            const needAmount = this.clacSubResourceAmount(task.target, task.amount, resType as ResourceConstant)
            this.getResource(resType as ResourceConstant, needAmount)
            // 一次只发布一个搬运任务
            return
        }

        // 能到这里说明底物都已转移完毕
        this.setState(FactoryState.Working)
    }

    private getResource(resType: ResourceConstant, amount: number): void {
        const source = this.room.myStorage.getResourcePlace(resType, amount)
        // 这里如果 terminal 中的资源也不足的话会把 factory 卡在这个位置
        // 这里不能挂起任务，因为它之后有更高级的任务以他为原料，如果它没有合成的话
        // 准备阶段会重新拆出来一个低级任务，如果底物缺失很久的话，会导致循环拆分从而堆积很多相同任务
        if (resType !== RESOURCE_ENERGY && this.room.terminal) {
            if (this.room.terminal.store[resType] < amount) {
                // 不在黑名单里就尝试自己合成
                if (!this.inBlacklist(resType)) {
                    this.handleInsufficientResource(resType, amount)
                    this.log.warning(`发现底物不足，进行拆分：${resType} ${amount}`)
                }
                // 缺少的是基础资源，等一等
                else this.gotoBed(100, `缺少 ${resType}*${amount}`)
                // this.log.warning(`合成暂停，缺少 ${resType}*${needAmount}`)
                return
            }
        }
        // 能量太少了就先不干
        else if (!this.hasEnoughEnergy()) return

        // 请求资源
        this.room.transport.addTask({
            type: TransportTaskType.FactoryGetResource,
            requests: [{ from: source.id, to: this.factory.id, resType, amount }]
        })
    }

    /**
     * 检查工作所需能量是否充足
     */
    private hasEnoughEnergy(): boolean {
        const { total } = this.room.myStorage.getResource(RESOURCE_ENERGY)
        if (total >= ENERGY_LIMIT) return true

        // 如果能量不足了则休眠
        this.gotoBed(10000, '能量不足')
        return false
    }
}