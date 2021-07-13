import { Color } from "@/modulesGlobal"
import FactoryBase from "./base"
import { FactoryState } from "./constant"
import { FactoryTask } from "./types"

/**
 * 工作阶段
 * 一直执行合成直到资源不足
 */
export default class StageWorking extends FactoryBase {
    constructor(roomName: string) {
        super(roomName)
    }

    public run(): void {
        const task = this.getCurrentTask()
        // 一般到这一步是不会产生没有任务的问题
        if (!task) {
            this.setState(FactoryState.Prepare)
            delete this.memory.produceCheck
            return
        }

        // 没有冷却好就直接跳过
        if (this.factory.cooldown) {
            if (this.memory.produceCheck) {
                // 发现材料不足了就进入下个阶段
                if (!this.canContinueProduce(task)) this.setState(FactoryState.PutResource)
                // 移除标志位，每个冷却阶段只检查一次材料是否充足就够了
                delete this.memory.produceCheck
            }
            return
        }

        const actionResult = this.factory.produce(task.target)

        // 成功生产了就将举起检查标志位，等待下个 tick 检查底物数量
        if (actionResult === OK) this.memory.produceCheck = true
        // 这里只是个兜底，一般情况下在上面的 this.canContinueProduce() 判断后就已经确定了是否要进入下个阶段
        else if (actionResult === ERR_NOT_ENOUGH_RESOURCES) this.setState(FactoryState.PutResource)
        else if (actionResult === ERR_INVALID_TARGET || actionResult === ERR_BUSY) this.requirePower()
        else this.log(`working 阶段出现异常，错误码: ${actionResult}`, Color.Red)
    }

    /**
     * 检查当前 factory 中的底物是否足够再次生产
     * @returns true 表示可以继续生产，false 表示无法继续生产
     */
    private canContinueProduce(task: FactoryTask): boolean {
        // 遍历任务目标所需的材料，如果有一项材料不足了，就说明无法继续生产
        const subRes = COMMODITIES[task.target].components
        for (const res in subRes) {
            if (this.factory.store[res] < subRes[res]) return false
        }

        // 所有材料都充足，可以继续生产
        return true
    }

    /**
     * 请求 power factory
     */
    private requirePower(): void {
        if (this.room.controller.isPowerEnabled) this.room.power.addTask(PWR_OPERATE_FACTORY)
        else this.log(`请求 ${this.memory.level} 级 PWR_OPERATE_FACTORY, 但房间并未激活 power`, Color.Yellow)
    }
}