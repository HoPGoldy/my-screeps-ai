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
        if (Game.time % 5 || this.room.centerTransport.hasTask(STRUCTURE_FACTORY)) return 

        const task = this.getCurrentTask()
        // 一般到这一步是不会产生没有任务的问题
        if (!task) return this.setState(FactoryState.Prepare)

        // 遍历所有的底物，检查存放的是否充足
        // 自己存放的不足就发布转移任务
        const subResources = COMMODITIES[task.target].components
        for (const resType in subResources) {
            // 资源不足，发布任务
            if (this.factory.store[resType] < subResources[resType]) {
                const source = resType === RESOURCE_ENERGY ? STRUCTURE_STORAGE : STRUCTURE_TERMINAL
                // 合成任务需要的该材料数量
                const needAmount = this.clacSubResourceAmount(task.target, task.amount, resType as ResourceConstant)
                // 这里如果 terminal 中的资源也不足的话会把 factory 卡在这个位置
                // 这里不能挂起任务，因为它之后有更高级的任务以他为原料，如果它没有合成的话
                // 准备阶段会重新拆出来一个低级任务，如果底物缺失很久的话，会导致循环拆分从而堆积很多相同任务
                if (source === STRUCTURE_TERMINAL && this.room.terminal) {
                    if (this.room.terminal.store[resType] < needAmount) {
                        // 不在黑名单里就尝试自己合成
                        if (!this.inBlacklist(resType as ResourceConstant)) {
                            this.handleInsufficientResource(resType as ResourceConstant, needAmount)
                            this.log(`发现底物不足，进行拆分：${resType} ${needAmount}`, 'yellow', true)
                        }
                        // 缺少的是基础资源，等一等
                        else this.gotoBed(100, `缺少 ${resType}*${needAmount}`)
                        // return this.log(`合成暂停，缺少 ${resType}*${needAmount}`, 'yellow')
                    }
                }
                // 能量太少了就先不干
                else if (!this.energyCheck()) return

                // 发布中央物流任务
                this.room.centerTransport.addTask({
                    submit: STRUCTURE_FACTORY,
                    target: STRUCTURE_FACTORY,
                    source,
                    resourceType: resType as ResourceConstant,
                    amount: needAmount
                })
            }
        }

        // 能到这里说明底物都已转移完毕
        this.setState(FactoryState.Working)
    }

    /**
     * 检查工作所需能量是否充足
     */
    private energyCheck(): boolean {
        // 如果 storage 里能量不足了则休眠
        if (this.room.storage && this.room.storage.store[RESOURCE_ENERGY] >= ENERGY_LIMIT) return false
        
        this.gotoBed(10000, '能量不足')
        return true
    }
}