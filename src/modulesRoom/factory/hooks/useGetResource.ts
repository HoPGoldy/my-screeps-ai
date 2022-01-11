import { FactoryContext } from '../types'
import { FactoryMemoryAccessor } from '../memory'
import { FactoryState, FactoryTransportType, ENERGY_LIMIT } from '../constants'
import { clacSubResourceAmount, inBlacklist } from '../utils'
import { MaintenanceContext } from './useMaintenance'

/**
 * factory 工作阶段 - 获取资源
 * 会从其他建筑里获取资源填充到自己存储
 */
export const useGetResource = function (context: FactoryContext, db: FactoryMemoryAccessor, maintenanceContext: MaintenanceContext) {
    const { env, getFactory, hasTransportTask, getResourceStorePlace, getResourceAmount, addTransportTask } = context
    const { handleInsufficientResource, gotoBed } = maintenanceContext

    const runGetResource = function (room: Room) {
        if (env.inInterval(5) || hasTransportTask(room, FactoryTransportType.GetResource)) return

        const task = db.queryCurrentTask()
        // 一般到这一步是不会产生没有任务的问题
        if (!task) return db.updateState(FactoryState.Prepare)
        const factory = getFactory(room)

        // 遍历所有的底物，检查存放的是否充足
        // 自己存放的不足就发布转移任务
        const subResources = COMMODITIES[task.target].components
        for (const resType in subResources) {
            // 资源已经够了就不必发布任务
            if (factory.store[resType] >= subResources[resType]) continue

            // 合成任务需要的该材料数量
            const needAmount = clacSubResourceAmount(task.target, task.amount, resType as ResourceConstant)
            getResource(factory, resType as ResourceConstant, needAmount)
            // 一次只发布一个搬运任务
            return
        }

        // 能到这里说明底物都已转移完毕
        db.updateState(FactoryState.Working)
    }

    const getResource = function (factory: StructureFactory, resType: ResourceConstant, amount: number): void {
        const existAmount = getResourceAmount(factory.room, resType)
        // 这里如果房间里资源不足的话会把 factory 卡在这个生产任务
        // 这里不能挂起任务，因为它之后有更高级的任务以他为原料，如果它没有合成的话
        // 准备阶段会重新拆出来一个低级任务，如果底物缺失很久的话，会导致循环拆分从而堆积很多相同任务
        if (resType !== RESOURCE_ENERGY && existAmount < amount) {
            // 不在黑名单里就尝试自己合成
            if (!inBlacklist(resType)) {
                handleInsufficientResource(resType as CommodityConstant, amount)
                env.log.warning(`发现底物不足，进行拆分：${resType} ${amount}`)
            }
            // 缺少的是基础资源，等一等
            else gotoBed(100, `缺少 ${resType}*${amount}`)
            // env.log.warning(`合成暂停，缺少 ${resType}*${needAmount}`)
            return
        }
        // 能量太少了就先不干
        else if (!hasEnoughEnergy(factory.room)) return

        const source = getResourceStorePlace(factory.room, resType, amount)

        // 请求资源
        addTransportTask(factory.room, FactoryTransportType.GetResource, [{
            from: source.id,
            to: factory.id,
            resType,
            // 注意这里取了个最小而不是直接用 amount，因为房间里的同一种资源有可能分散在不同的建筑里
            // 例如需要 500H，storage 里有 300H，terminal 里有 200H
            // 如果这里不用 Math.min 的话就会出现想从一个建筑里拿 500H 的情况
            amount: Math.min(source.store[resType], amount)
        }])
    }

    /**
     * 检查工作所需能量是否充足
     */
    const hasEnoughEnergy = function (room: Room): boolean {
        const existAmount = getResourceAmount(room, RESOURCE_ENERGY)
        if (existAmount >= ENERGY_LIMIT) return true

        // 如果能量不足了则休眠
        gotoBed(10000, '能量不足')
        return false
    }

    return runGetResource
}
