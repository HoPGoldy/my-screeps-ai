import { FactoryContext, FactoryLevel, FactoryMemory, FactoryTask } from '../types'
import { FactoryMemoryAccessor } from '../memory'
import { FactoryState } from '../constants'

/**
 * factory 工作阶段 - 合成阶段
 * 该阶段会一直执行合成直到资源不足
 */
export const useWorking = function (context: FactoryContext, db: FactoryMemoryAccessor) {
    const { env, getFactory, requestPowerFactory } = context

    const runWorking = function (room: Room, memory: FactoryMemory) {
        const task = db.queryCurrentTask()
        // 一般到这一步是不会产生没有任务的问题
        if (!task) {
            db.updateState(FactoryState.Prepare)
            delete memory.produceCheck
            return
        }
        const factory = getFactory(room)

        // 没有冷却好就直接跳过
        if (factory.cooldown) {
            if (memory.produceCheck) {
                // 发现材料不足了就进入下个阶段
                if (!canContinueProduce(factory, task)) db.updateState(FactoryState.PutResource)
                // 移除标志位，每个冷却阶段只检查一次材料是否充足就够了
                delete memory.produceCheck
            }
            return
        }

        const actionResult = factory.produce(task.target)

        // 成功生产了就将举起检查标志位，等待下个 tick 检查底物数量
        if (actionResult === OK) memory.produceCheck = true
        // 这里只是个兜底，一般情况下在上面的 canContinueProduce() 判断后就已经确定了是否要进入下个阶段
        else if (actionResult === ERR_NOT_ENOUGH_RESOURCES) db.updateState(FactoryState.PutResource)
        // 无法合成，请求 power
        else if (actionResult === ERR_INVALID_TARGET || actionResult === ERR_BUSY) {
            requirePower(room, factory, memory.level)
        }
        else env.log.error(`working 阶段出现异常，错误码: ${actionResult}`)
    }

    /**
     * 检查当前 factory 中的底物是否足够再次生产
     * @returns true 表示可以继续生产，false 表示无法继续生产
     */
    const canContinueProduce = function (factory: StructureFactory, task: FactoryTask): boolean {
        // 遍历任务目标所需的材料，如果有一项材料不足了，就说明无法继续生产
        const subRes = COMMODITIES[task.target].components
        for (const res in subRes) {
            if (factory.store[res] < subRes[res]) return false
        }

        // 所有材料都充足，可以继续生产
        return true
    }

    /**
     * 请求 power factory
     */
    const requirePower = function (room: Room, factory: StructureFactory, level: FactoryLevel): void {
        if (room.controller.isPowerEnabled) requestPowerFactory(room, factory)
        else env.log.warning(`请求 ${level} 级 PWR_OPERATE_FACTORY, 但房间并未激活 power`)
    }

    return runWorking
}
