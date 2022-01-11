import { FactoryContext, FactoryMemory } from '../types'
import { FactoryMemoryAccessor } from '../memory'
import { FactoryState } from '../constants'
import { clacSubResourceAmount, inBlacklist } from '../utils'
import { MaintenanceContext } from './useMaintenance'

/**
 * factory 工作阶段 - 准备阶段
 * 该阶段会对队列中的任务进行新增（没有任务）或分解（任务无法完成）操作，一旦发现可以生成的任务，则进入下个阶段。
 */
export const usePrepare = function (context: FactoryContext, db: FactoryMemoryAccessor, maintenanceContext: MaintenanceContext) {
    const { env, getResourceAmount } = context
    const { handleInsufficientResource, addTask, gotoBed } = maintenanceContext

    const runPrepare = function (room: Room, memory: FactoryMemory) {
        if (env.inInterval(5)) return

        // 如果存在废弃进程，则移除所有配置
        if (memory.remove) {
            Object.keys(memory).forEach(key => delete memory[key])
            return env.log.success('工厂已废弃，重新初始化以开始生产')
        }

        if (!room.terminal && !room.storage) {
            gotoBed(10000, '未找到 terminal 和 storage')
            return env.log.error('prepare 阶段未找到 terminal 和 storage，已暂停')
        }

        // 获取当前任务，没有任务就新增顶级合成任务
        const task = db.queryCurrentTask()
        if (!task) {
            addTask()
            return
        }

        // 遍历查看 terminal 中底物数量是否足够
        const subResources = COMMODITIES[task.target].components
        for (const resType in subResources) {
            // 首先得保证这个东西是能合成的，不然推进去一个 energy 或者原矿的合成任务就尴尬了
            if (inBlacklist(resType as CommodityConstant)) continue

            // 底物所需的数量
            // 由于反应可能会生成不止一个产物，所以需要除一下并向上取整
            const subResAmount = clacSubResourceAmount(task.target, task.amount, resType as CommodityConstant)

            if (getResourceAmount(room, resType as CommodityConstant) < subResAmount) {
                handleInsufficientResource(resType as CommodityConstant, subResAmount)

                // 挂起当前任务
                return db.hangTask()
            }
        }

        // 通过了底物检查就说明可以合成，进入下个阶段
        db.updateState(FactoryState.GetResource)
    }

    return runPrepare
}
