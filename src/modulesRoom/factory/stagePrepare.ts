import FactoryBase from './base'
import { FactoryState } from './constant'

/**
 * 准备阶段
 * 该阶段会对队列中的任务进行新增（没有任务）或分解（任务无法完成）操作，一旦发现可以生成的任务，则进入下个阶段。
 */
export default class StagePrepare extends FactoryBase {
    public run (): void {
        if (Game.time % 5) return

        // 如果存在废弃进程，则移除所有配置
        if (this.memory.remove) {
            this.memory = undefined
            return this.log.success('工厂已废弃，重新初始化以开始生产')
        }

        if (!this.room.terminal) {
            this.gotoBed(10000, '未找到 terminal')
            return this.log.error('prepare 阶段未找到 terminal，已暂停')
        }

        // 获取当前任务，没有任务就新增顶级合成任务
        const task = this.getCurrentTask()
        if (!task) {
            this.addTask()
            return
        }

        // 遍历查看 terminal 中底物数量是否足够
        const subResources = COMMODITIES[task.target].components
        for (const resType in subResources) {
            // 首先得保证这个东西是能合成的，不然推进去一个 energy 或者原矿的合成任务就尴尬了
            if (this.inBlacklist(resType as ResourceConstant)) continue

            // 底物所需的数量
            // 由于反应可能会生成不止一个产物，所以需要除一下并向上取整
            const subResAmount = this.clacSubResourceAmount(task.target, task.amount, resType as ResourceConstant)

            if (this.room.terminal.store[resType] < subResAmount) {
                this.handleInsufficientResource(resType as ResourceConstant, subResAmount)

                // 挂起当前任务
                return this.hangTask()
            }
        }

        // 通过了底物检查就说明可以合成，进入下个阶段
        this.setState(FactoryState.GetResource)
    }
}
