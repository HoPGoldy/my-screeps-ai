import { useCache } from '@/utils'
import { MoveTargetInfo, ManagerData, ManagerState, TaskFinishReason, TransportRequestData, TransportWorkContext } from '../types'

export const onGetResource = (context: TransportWorkContext) => {
    const { manager, managerData } = context

    if (manager.store.getFreeCapacity() <= 0) {
        managerData.state = ManagerState.PutResource
        delete managerData.cacheSourceId
        return
    }

    // 找到要拿取的请求
    const processingRequest = getProcessingRequest(context)
    // 找不到就说明完成了或者自己拿到了最后一批，切换模式
    if (!processingRequest) {
        managerData.state = ManagerState.PutResource
        delete managerData.cacheSourceId
        return
    }

    // 找到往哪走
    const destination = getTarget(processingRequest, context)
    if (!destination) return

    // 走过去
    if (!manager.pos.isNearTo(destination.pos)) {
        manager.goTo(destination.pos, { range: 1 })
        return
    }

    // 拿起资源
    withdrawResource(destination, processingRequest, context)
}

const getProcessingRequest = function (context: TransportWorkContext) {
    const { manager, taskData } = context
    let otherUnfinishRequest: TransportRequestData

    const targetRes = taskData.requests.find(res => {
        const unfinish = getwithdrawAmount(res, manager) > 0
        const otherProcessing = res.managerName && res.managerName !== manager.name
        // console.log('unfinish && otherProcessing', unfinish, otherProcessing)
        // 会同时记录下没有完成但是有其他人正在处理的请求
        if (unfinish && otherProcessing) otherUnfinishRequest = res

        return unfinish
    })

    return targetRes || otherUnfinishRequest
}

const getTarget = function (request: TransportRequestData, context: TransportWorkContext): MoveTargetInfo<AnyStoreStructure> {
    const { manager, managerData, workRoom, requireFinishTask } = context
    let target: AnyStoreStructure
    let targetPos: RoomPosition

    // 没有指定位置
    if (!request.from) {
        target = workRoom.myStorage.getResourcePlace(request.resType)
        targetPos = target?.pos

        // 如果是能量就特判一下，因为能量可以从启动 container 里取到
        if (!targetPos && request.resType === RESOURCE_ENERGY) {
            return getEnergyStore(manager, workRoom, managerData)
        }
    }
    // 来源是个位置
    else if (typeof request.from === 'object') {
        targetPos = new RoomPosition(...request.from as [number, number, string])
    }
    // 来源是个 id
    else {
        target = Game.getObjectById(request.from)
        if (!target) {
            requireFinishTask(TaskFinishReason.CantFindSource)
            return
        }
        targetPos = target.pos
    }

    return { target, pos: targetPos }
}

const withdrawResource = function (
    destination: MoveTargetInfo<AnyStoreStructure>,
    request: TransportRequestData,
    context: TransportWorkContext
) {
    const { manager, managerData, requireFinishTask, taskData } = context
    let operationResult: ScreepsReturnCode

    if (!destination.target) {
        // 找到要捡起的资源
        const targetRes = destination.pos.lookFor(LOOK_RESOURCES)
            .find(res => res.resourceType === request.resType)

        operationResult = manager.pickup(targetRes)
    }
    else {
        const withdrawAmount = Math.min(
            destination.target.store[request.resType],
            getwithdrawAmount(request, manager),
            manager.store.getFreeCapacity()
        )

        if (request.amount) {
            // 指定了目标建筑，但是目标建筑里能量数量不够了，结束任务
            if (
                request.resType === RESOURCE_ENERGY &&
                request.from &&
                withdrawAmount < (manager.store.getFreeCapacity() / 2)
            ) {
                requireFinishTask(TaskFinishReason.NotEnoughResource)
                // manager.log(`能量数量不足： ${JSON.stringify(request)} 当前剩余 ${destination.target.store[request.resType]}`)
            }
        }
        // 没有指定拿的数量，如果计算出来的拿取数量太少了，说明这个能量源能量不够了
        // 清下缓存，去其他地方
        else {
            if (
                request.resType === RESOURCE_ENERGY &&
                withdrawAmount < (manager.store.getFreeCapacity() / 2)
            ) {
                delete managerData.cacheSourceId
            }
        }

        operationResult = manager.withdraw(destination.target, request.resType, withdrawAmount)
        if (operationResult === OK) {
            // 此时 withdraw 动作还没有真正执行，这里模拟判断一下会不会拿满，可以节省一 tick
            if (manager.store.getFreeCapacity() - withdrawAmount <= 0) {
                managerData.state = ManagerState.PutResource
                delete managerData.cacheSourceId
                return
            }
        }
    }

    if (operationResult === OK) {
        if (!request.managerName) request.managerName = manager.name
    }
    // 拿不下了就运过去
    else if (operationResult === ERR_FULL) {
        managerData.state = ManagerState.PutResource
        delete managerData.cacheSourceId
    }
    // 捡起资源的时候可能会出现 ERR_INVALID_TARGET 的情况
    else if (operationResult === ERR_NOT_ENOUGH_RESOURCES || operationResult === ERR_INVALID_TARGET) {
        if (request.keep) return
        if (request.amount) {
            requireFinishTask(TaskFinishReason.NotEnoughResource)
            // manager.log(`执行搬运任务是出现资源不足问题： ${JSON.stringify(request)}`)
        }
        // 没有指定搬运数量，并且把来源搬空了，任务正常结束
        else requireFinishTask(TaskFinishReason.Complete)
    }
    else {
        manager.log(`物流任务获取资源出错！${operationResult} ${JSON.stringify(request)}`)
    }
}

/**
 * 获取某个资源还应该再拿多少数量
 */
const getwithdrawAmount = function (res: TransportRequestData, manager: Creep) {
    // 没有指定数里，能拿多少拿多少
    if (res.amount === undefined) return manager.store.getFreeCapacity()
    return Math.max(res.amount - (res.arrivedAmount + manager.store[res.resType] || 0), 0)
}

/**
 * 搬运工去房间内获取能量
 */
const getEnergyStore = function (manager: Creep, workRoom: Room, managerData: ManagerData): MoveTargetInfo<AnyStoreStructure> {
    // 从工作房间查询并缓存能量来源
    const source = useCache(() => {
        const energyContainer = workRoom[STRUCTURE_CONTAINER].filter(container => {
            return container.store[RESOURCE_ENERGY] >= manager.store.getFreeCapacity()
        })
        if (energyContainer.length > 0) {
            return manager.pos.findClosestByRange(energyContainer)
        }

        const droppedEnergys = workRoom.source.map(source => source.getDroppedInfo().energy)
            .filter(energy => energy && energy.amount >= manager.store.getFreeCapacity())

        if (droppedEnergys.length > 0) {
            return manager.pos.findClosestByRange(droppedEnergys)
        }
    }, managerData, 'cacheSourceId')

    // 没有能量，先移动到 source 附件待命
    if (!source) {
        delete managerData.cacheSourceId
        return { pos: workRoom.source[0].pos }
    }

    const moveTarget = source instanceof Structure ? source : undefined
    return { target: moveTarget, pos: source.pos }
}
