import { DestinationTarget, MoveTargetInfo, ManagerState, TaskFinishReason, TransportRequestData, TransportWorkContext } from '../types'

export const onPutResource = (context: TransportWorkContext) => {
    const { manager, managerData } = context

    if (manager.store.getCapacity() <= 0) {
        managerData.state = ManagerState.PutResource
        delete managerData.cacheTargetId
        return
    }

    // 找到要运输的请求
    const processingRequest = getProcessingRequest(context)
    if (!processingRequest) return

    // 找到往哪走
    const destination = getTarget(processingRequest, context)
    if (!destination) return

    // 走过去
    if (!manager.pos.isNearTo(destination.pos)) {
        manager.goTo(destination.pos, { range: destination.target ? 1 : 0 })
        return
    }

    // 找到要放下多少
    const transferAmount = getTransferAmount(manager.store, processingRequest)

    // 放下资源
    transferResource(destination.target, processingRequest, transferAmount, manager)
}

const getTarget = function (request: TransportRequestData, context: TransportWorkContext): MoveTargetInfo {
    const { workRoom, requireFinishTask, manager } = context
    let target: Creep | StructureWithStore | PowerCreep
    let pos: RoomPosition

    // 没有指定目标位置
    if (!request.to) {
        target = workRoom.myStorage.getStorePlace(request.resType)
    }
    // 目的地是个位置或者建筑类型数组
    if (typeof request.to === 'object') {
        try {
            pos = new RoomPosition(...request.to as [number, number, string])
        }
        // 失败了，目标地是个建筑类型数组
        catch (e) {
            for (const type of request.to as StructureConstant[]) {
                const structures = workRoom[type] as StructureWithStore[]

                // 不是建筑类型、找不到建筑、不能 store 的建筑都退出
                if (!structures || structures.length <= 0 || !('store' in structures[0])) {
                    requireFinishTask(TaskFinishReason.CantFindTarget)
                    return
                }

                const needFillStructures = structures.filter(s => s.store.getFreeCapacity(request.resType) > 0)

                // 找最近的
                if (needFillStructures.length > 0) {
                    target = manager.pos.findClosestByRange(needFillStructures)
                    break
                }
            }

            // // 找不到，说明要填充的建筑都填满了，完成任务
            if (!target) {
                requireFinishTask(TaskFinishReason.Complete)
                return
            }
        }
    }
    // 来源是个 id
    else if (typeof request.to === 'string') {
        target = Game.getObjectById(request.to as Id<StructureWithStore | Creep | PowerCreep>)
        if (!target) {
            requireFinishTask(TaskFinishReason.CantFindTarget)
            return
        }
    }

    if (target) pos = target.pos
    return { target, pos }
}

const getProcessingRequest = function (context: TransportWorkContext) {
    const { managerData, manager, taskData, requireFinishTask } = context

    // 找到要放下的资源
    let otherUnfinishRequest: TransportRequestData
    const targetRes = taskData.requests.find(request => {
        const hasCarrying = manager.store[request.resType]
        const isMyRequest = request.managerName && request.managerName === manager.name

        if (!isMyRequest && hasCarrying) otherUnfinishRequest = request
        return hasCarrying
    })

    // 身上的资源转移完毕，检查下是不是所有资源都完成了
    if (!targetRes && !otherUnfinishRequest) {
        const allFinished = taskData.requests.every(res => (res.arrivedAmount || 0) <= res.amount)

        if (!allFinished) {
            managerData.state = ManagerState.GetResource
            delete managerData.cacheTargetId
        }
        else requireFinishTask(TaskFinishReason.Complete)
        return
    }

    return targetRes || otherUnfinishRequest
}

const transferResource = function (
    destinationTarget: DestinationTarget,
    targetRes: TransportRequestData,
    transferAmount: number,
    manager: Creep
) {
    console.log('要运输多少资源', targetRes.resType, transferAmount, manager.store[targetRes.resType])

    let transferResult: ScreepsReturnCode
    if (!destinationTarget) {
        transferResult = manager.drop(targetRes.resType, transferAmount)
    }
    else {
        transferResult = manager.transfer(destinationTarget, targetRes.resType, transferAmount)
    }

    if (transferResult === OK) {
        targetRes.arrivedAmount = (targetRes.arrivedAmount || 0) + transferAmount
        // 这一趟运完了就及时删掉名字，方便其他搬运工尽早继续处理对应的请求
        delete targetRes.managerName
    }
    else {
        manager.log(
            `物流任务存放资源出错！${transferResult} ${destinationTarget} ` +
            `${JSON.stringify(targetRes)} ${transferAmount}`
        )
    }
}

/**
 * 查找本次应该放下多少该资源
 *
 * 注意这里计算搬运量没有考虑目标建筑，因为考虑了也没什么意义
 * 比如目标建筑存储可以放得下，皆大欢喜
 * 如果目标建筑放不下，而任务里指定了要运输多少资源，怎么办，指标完不成也不能让任务一直卡着
 * 最多报个放不下了的 log 然后关闭任务，而这个报错恰好可以通过 transfer 的返回值拿到
 *
 * @param managerStore 搬运工的存储
 * @param targetRes 要转移的资源
 */
const getTransferAmount = function (managerStore: StoreDefinition, targetRes: TransportRequestData): number {
    // 返回 undefeind，让 transfer 自己找到合适的最大转移数量
    if (targetRes.amount === undefined) return undefined

    const remainingTransferAmount = targetRes.amount - (targetRes.arrivedAmount || 0)
    return Math.min(managerStore[targetRes.resType], remainingTransferAmount)
}
