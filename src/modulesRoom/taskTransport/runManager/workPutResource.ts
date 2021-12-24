import { StructureShortcutKey } from '@/modulesRoom/shortcut/types'
import { getStructure } from '@/mount/room/shortcut'
import { DestinationTarget, MoveTargetInfo, ManagerState, TaskFinishReason, TransportRequestData, TransportWorkContext } from '../types'

export const onPutResource = (context: TransportWorkContext) => {
    const { manager, managerData, taskData, requireFinishTask } = context

    // 请求都完成了，任务结束
    if (taskData.requests.length <= 0) {
        requireFinishTask(TaskFinishReason.Complete)
        return
    }

    if (manager.store.getCapacity() <= 0) {
        managerData.state = ManagerState.GetResource
        delete managerData.cacheTargetId
        return
    }

    // 找到要运输的请求
    const processingRequest = getProcessingRequest(context)
    // 有请求存在，但是其中找不到自己能运输的，说明自己身上的资源不够，回去拿
    if (!processingRequest) {
        managerData.state = ManagerState.GetResource
        delete managerData.cacheTargetId
        return
    }

    // 找到往哪走
    const destination = getTarget(processingRequest, context)
    // 这个请求已经被填满了，移除请求并返回
    if (destination === ERR_FULL) {
        const fullReuqestIndex = taskData.requests.findIndex(req => req === processingRequest)
        taskData.requests.splice(fullReuqestIndex, 1)
        // 请求都完成了，结束任务
        if (taskData.requests.length <= 0) requireFinishTask(TaskFinishReason.Complete)
        return
    }
    // 找不到目标，报错返回
    else if (destination === ERR_INVALID_ARGS) {
        requireFinishTask(TaskFinishReason.CantFindTarget)
        return
    }

    // 走过去
    if (!manager.pos.isNearTo(destination.pos)) {
        manager.goTo(destination.pos, { range: 1 })
        return
    }

    // 找到要放下多少
    const transferAmount = getTransferAmount(manager.store, processingRequest)

    // 放下资源
    transferResource(destination.target, processingRequest, transferAmount, context)
}

/**
 * 获取指定物流请求的目标存放地
 *
 * @returns ERR_FULL 目标都被填满了
 * @returns ERR_INVALID_ARGS 参数异常导致找不到目标
 */
const getTarget = function (request: TransportRequestData, context: TransportWorkContext): ERR_FULL | ERR_INVALID_ARGS | MoveTargetInfo {
    const { workRoom, manager } = context
    let target: Creep | AnyStoreStructure | PowerCreep
    let pos: RoomPosition

    // 没有指定目标位置
    if (!request.to) {
        target = workRoom.storageController.getStorePlace(request.resType)
    }
    // 目的地是个位置或者建筑类型数组
    if (typeof request.to === 'object') {
        // 目的地是位置
        if (typeof request.to[0] === 'number') {
            pos = new RoomPosition(...request.to as [number, number, string])
        }
        // 目的地是建筑类型数组
        else {
            const structureResult = getStructureByType(request, workRoom, manager)
            if (typeof structureResult === 'number') return structureResult
            target = structureResult
        }
    }
    // 来源是个 id
    else if (typeof request.to === 'string') {
        target = Game.getObjectById(request.to as Id<AnyStoreStructure | Creep | PowerCreep>)
        if (!target) return ERR_INVALID_ARGS
    }

    if (target) pos = target.pos
    return { target, pos }
}

const getStructureByType = function (request: TransportRequestData, workRoom: Room, manager: Creep): ERR_FULL | ERR_INVALID_ARGS | AnyStoreStructure {
    for (const type of request.to as StructureShortcutKey[]) {
        const structures = getStructure(workRoom, type)

        // 不是建筑类型、找不到建筑、不能 store 的建筑都退出
        if (!structures) return ERR_INVALID_ARGS

        const needFillStructures = structures.filter(s => {
            if (!('store' in s)) throw new Error(`类型为 ${type} 的建筑没有 store 属性`)
            return s.store.getFreeCapacity(request.resType) > 0
        })

        // 找最近的
        if (needFillStructures.length > 0) {
            return manager.pos.findClosestByRange(needFillStructures) as AnyStoreStructure
        }
    }

    // 走到这里说明要填充的建筑都填满了，完成任务
    return ERR_FULL
}

const getProcessingRequest = function (context: TransportWorkContext) {
    const { manager, taskData } = context

    // 找到要放下的资源
    let otherUnfinishRequest: TransportRequestData
    const targetRes = taskData.requests.find(request => {
        // 注意这里不会通过资源已搬运数量判断请求是否完成，因为完成的请求都被删除了，留在这里的肯定时没完成的请求
        const hasCarrying = manager.store[request.resType] > 0
        const isMyRequest = request.managerName && request.managerName === manager.name

        if (!isMyRequest && hasCarrying) otherUnfinishRequest = request
        return isMyRequest && hasCarrying
    })

    return targetRes || otherUnfinishRequest
}

const transferResource = function (
    destinationTarget: DestinationTarget,
    targetReq: TransportRequestData,
    transferAmount: number,
    context: TransportWorkContext
) {
    const { manager, taskData, requireFinishTask } = context
    const { resType, amount, arrivedAmount } = targetReq
    // transferAmount && manager.log(`放下 ${resType} ${transferAmount}`)

    let transferResult: ScreepsReturnCode
    let notTransferAll = false

    if (!destinationTarget) {
        transferResult = manager.drop(resType, transferAmount)
    }
    else {
        // 不是自己的建筑，塞不进去的
        if (!destinationTarget.my) {
            requireFinishTask(TaskFinishReason.CantFindTarget)
            return
        }
        const realTransferAmount = Math.min(destinationTarget.store.getFreeCapacity(), transferAmount)
        if (realTransferAmount !== transferAmount) notTransferAll = true
        transferResult = manager.transfer(destinationTarget, resType, realTransferAmount)
    }

    if (transferResult === OK) {
        // 这一趟运完了就及时删掉名字，方便其他搬运工尽早继续处理对应的请求
        delete targetReq.managerName
        // 这个请求没有配置搬运量，就不更新已搬运数量了
        // 留在下个 tick，通过检查是否还有空余空间的建筑来确定请求是否完成x
        if (!amount) return

        // 更新已搬运数量
        // manager.log(`更新已抵达数量 ${targetReq.arrivedAmount} ${JSON.stringify(targetReq)}`)
        targetReq.arrivedAmount = (arrivedAmount || 0) + transferAmount
        // 检查下，如果已经搬够了就完成请求
        // 注意这里如果目标建筑满了也是当作任务完成
        if (!notTransferAll) {
            if (targetReq.arrivedAmount < amount) return
        }

        // 移除请求
        const fullReuqestIndex = taskData.requests.findIndex(req => req === targetReq)
        taskData.requests.splice(fullReuqestIndex, 1)
        // 请求都完成了，结束任务
        if (taskData.requests.length <= 0) requireFinishTask(TaskFinishReason.Complete)
    }
    else {
        manager.log(
            `物流任务存放资源出错！${transferResult} ${destinationTarget} ` +
            `${JSON.stringify(targetReq)} ${transferAmount}`
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
