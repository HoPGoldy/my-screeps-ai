import { findStrategy, getRoomEnergyTarget } from "@/modulesGlobal/energyUtils"
import { useCache } from "@/utils"
import { MoveTargetInfo, ManagerData, ManagerState, TaskFinishReason, TransportRequestData, TransportWorkContext } from "../types"

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
    const arrived = destination.target
        ? manager.pos.isEqualTo(destination.pos)
        : manager.pos.isNearTo(destination.pos)

    if (!arrived) {
        manager.goTo(destination.pos, { range: destination.target ? 1 : 0 })
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

        // 会同时记录下没有完成但是有其他人正在处理的请求
        if (unfinish && otherProcessing) otherUnfinishRequest = res
        return unfinish
    })

    return targetRes ? targetRes : otherUnfinishRequest
}

const getTarget = function (request: TransportRequestData, context: TransportWorkContext): MoveTargetInfo<StructureWithStore> {
    const { manager, managerData, workRoom, requireFinishTask } = context
    let target: StructureWithStore
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
    destination: MoveTargetInfo<StructureWithStore>,
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
            getwithdrawAmount(request, manager)
        )

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
        if (!managerData.carrying) managerData.carrying = []
        const requestIndex = taskData.requests.findIndex((req => req === request))
        managerData.carrying.push(requestIndex)
        if (!request.managerName) request.managerName = manager.name
    }
    // 拿不下了就运过去
    else if (operationResult === ERR_FULL) {
        managerData.state = ManagerState.PutResource
        delete managerData.cacheSourceId
        return
    }
    else if (operationResult === ERR_NOT_ENOUGH_RESOURCES) {
        if (request.keep) return
        requireFinishTask(TaskFinishReason.NotEnoughResource)
        manager.log(`执行搬运任务是出现资源不足问题： ${JSON.stringify(request)}`)
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
    if (res.amount == undefined) return manager.store.getFreeCapacity()
    return Math.max(res.amount - (res.arrivedAmount + manager.store[res.resType] || 0), 0)
}

/**
 * 搬运工去房间内获取能量
 */
const getEnergyStore = function (manager: Creep, workRoom: Room, managerData: ManagerData): MoveTargetInfo<StructureWithStore> {
    // 从工作房间查询并缓存能量来源
    const source = useCache(() => {
        return getRoomEnergyTarget(workRoom, findStrategy.getClosestTo(manager.pos))
    }, managerData, 'cacheSourceId')

    // 没有能量，先移动到 source 附件待命
    if (!source) {
        delete managerData.cacheSourceId
        return { pos: workRoom.source[0].pos }
    }

    const moveTarget = source instanceof Structure ? source : undefined
    return { target: moveTarget, pos: source.pos }
}