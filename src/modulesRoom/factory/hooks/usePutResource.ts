import { FactoryContext, FactoryMemory } from '../types'
import { FactoryMemoryAccessor } from '../memory'
import { FactoryState, FactoryTransportType } from '../constants'

/**
 * factory 工作阶段 - 准备阶段
 * 该阶段会对队列中的任务进行新增（没有任务）或分解（任务无法完成）操作，一旦发现可以生成的任务，则进入下个阶段。
 */
export const usePutResource = function (context: FactoryContext, db: FactoryMemoryAccessor) {
    const { env, getFactory, hasTransportTask, addTransportTask, onFinishProduce } = context

    const runPutResource = function (room: Room, memory: FactoryMemory) {
        if (env.inInterval(5) || hasTransportTask(room, FactoryTransportType.PutResource)) return

        const task = db.queryCurrentTask()
        // 一般到这一步是不会产生没有任务的问题
        if (!task) return db.updateState(FactoryState.Prepare)
        const factory = getFactory(room)

        // 把所有东西都搬出去，保持工厂存储净空
        const requests = Object.keys(factory.store).map((resType: ResourceConstant) => {
            // 是目标产物的话就更新统计信息
            if (resType === task.target && onFinishProduce) onFinishProduce(room, resType, factory.store[resType])

            const target = resType === RESOURCE_ENERGY ? room.storage : room.terminal
            return { from: factory.id, to: target.id, resType, amount: factory.store[resType] }
        })

        if (requests.length > 0) {
            addTransportTask(room, FactoryTransportType.PutResource, requests)
            return
        }

        // 能到这里说明产物都转移完成，移除已完成任务并重新开始准备阶段
        // 这里没有检查目标产物数量是否足够就直接移除任务
        // 原因是后面合成高级任务的时候如果发现材料不足就会自动发布数量合适的新任务
        // 所以没必要在这里增加代码复杂度
        db.deleteCurrentTask()
        db.updateState(FactoryState.Prepare)
    }

    return runPutResource
}
