import { ManagerData, ManagerState, TaskFinishReason, TransportRequestData, TransportTaskData, TransportWorkContext } from "../types"

export const onGetResource = (context: TransportWorkContext) => {
    const { taskData, manager, workRoom, managerData, requireFinishTask } = context

    if (manager.store.getFreeCapacity() <= 0) {
        managerData.state = ManagerState.PutResource
        return
    }

    // 来源是个位置
    if (typeof taskData.from === 'object') {
        const sourcePos = new RoomPosition(...taskData.from)
        if (!sourcePos) return requireFinishTask(TaskFinishReason.CantFindSource)

        getResourceFromPos(sourcePos, context)
    }
    // 来源是个建筑
    else if (typeof taskData.from === 'string') {
        const sourceStructure = Game.getObjectById(taskData.from)
        if (!sourceStructure) return requireFinishTask(TaskFinishReason.CantFindSource)

        getResourceFromStructure(sourceStructure, context)
    }
    // 没有指定来源
    else {
        getResourceFromRoom(workRoom, context)
    }
}

/**
 * 从指定位置获取物流任务资源
 */
const getResourceFromPos = function (sourcePos: RoomPosition, context: TransportWorkContext) {
    const { taskData, manager, managerData, requireFinishTask } = context

    if (!manager.pos.isNearTo(sourcePos)) {
        manager.goTo(sourcePos)
        return
    }

    // 找到目标位置丢弃的资源，并转化为 kv 格式
    const droppedRes = sourcePos.lookFor(LOOK_RESOURCES)
        .reduce<Map<ResourceConstant, Resource<ResourceConstant>>>((resMap, nextRes) => {
            resMap.set(nextRes.resourceType, nextRes)
            return resMap
        }, new Map())

    // 找到要捡起的资源
    const targetRes = findMoveResource(taskData, manager, type => droppedRes.get(type)?.amount || 0)

    // 还找不到就说明都已经取到身上了、或者别的爬在运
    if (!targetRes) {
        managerData.state = ManagerState.PutResource
        return
    }

    // 捡起资源，捡起不能设置数量
    const pickupRes = droppedRes.get(targetRes.resType)
    const result = manager.pickup(pickupRes)

    handleGetResourceRetureCode(result, managerData, targetRes, manager, requireFinishTask)
}

/**
 * 从指定建筑获取物流任务资源
 */
const getResourceFromStructure = function (sourceStructure: StructureWithStore, context: TransportWorkContext) {
    const { taskData, manager, managerData, requireFinishTask } = context

    if (!manager.pos.isNearTo(sourceStructure.pos)) {
        manager.goTo(sourceStructure.pos)
        return
    }

    const targetRes = findMoveResource(taskData, manager, type => sourceStructure.store[type])

    // 还找不到就说明都已经取到身上了、或者别的爬在运
    if (!targetRes) {
        managerData.state = ManagerState.PutResource
        return
    }

    const withdrawAmount = Math.min(
        sourceStructure.store[targetRes.resType],
        getwithdrawAmount(targetRes, manager)
    )
    const result = manager.withdraw(sourceStructure, targetRes.resType, withdrawAmount)

    if (result === OK) {
        // 此时 withdraw 动作还没有真正执行，这里模拟判断一下会不会拿满，可以节省一 tick
        if (manager.store.getFreeCapacity() - withdrawAmount <= 0) {
            managerData.state = ManagerState.PutResource
            return
        }
    }

    handleGetResourceRetureCode(result, managerData, targetRes, manager, requireFinishTask)
}

/**
 * 从指定房间获取物流任务资源
 * （用于没有指定资源来处的物流任务）
 */
const getResourceFromRoom = function (sourceRoom: Room, context: TransportWorkContext) {
    const { taskData, manager, managerData, requireFinishTask } = context

    // 先找到资源，不然不知道往哪走
    const targetRes = findMoveResource(taskData, manager, type => sourceRoom.myStorage.getResource(type)?.total || 0)

    // 还找不到就说明都已经取到身上了、或者别的爬在运
    if (!targetRes) {
        managerData.state = ManagerState.PutResource
        return
    }

    // 找到要去的位置，先走过去
    const sourceStructure = sourceRoom.myStorage.getResourcePlace(targetRes.resType)
    if (!manager.pos.isNearTo(sourceStructure.pos)) {
        manager.goTo(sourceStructure.pos)
        return
    }

    const withdrawAmount = Math.min(
        manager.store.getFreeCapacity(),
        sourceStructure.store[targetRes.resType],
        targetRes.amount - manager.store[targetRes.resType] - (targetRes.arrivedAmount || 0)
    )
    const result = manager.withdraw(sourceStructure, targetRes.resType, withdrawAmount)

    if (result === OK) {
        // 此时 withdraw 动作还没有真正执行，这里模拟判断一下会不会拿满，可以节省一 tick
        if (manager.store.getFreeCapacity() - withdrawAmount <= 0) {
            managerData.state = ManagerState.PutResource
            return
        }
    }

    handleGetResourceRetureCode(result, managerData, targetRes, manager, requireFinishTask)
}

/**
 * 查找本 tick 要拿到身上的任务资源
 */
 const findMoveResource = function (
    taskData: TransportTaskData,
    manager: Creep,
    getResAmount: (resType: ResourceConstant) => number
) {
    // 先找一个没有人运的资源
    let targetRes = taskData.res.find(res => {
        if (res.managerName && res.managerName !== manager.name) return false
        if (getResAmount(res.resType) <= 0) return false
        return getwithdrawAmount(res, manager) > 0
    })

    // 找不到就去去看看别的爬在负责的资源，去棒棒忙
    if (!targetRes) {
        targetRes = taskData.res.find(res => {
            if (getResAmount(res.resType) <= 0) return false
            return getwithdrawAmount(res, manager) > 0
        })
    }

    return targetRes
}

/**
 * 获取某个资源还应该再拿多少数量
 */
const getwithdrawAmount = function (res: TransportRequestData, manager: Creep) {
    // 没有指定数里，能拿多少拿多少
    if (res.amount == undefined) return manager.store.getFreeCapacity()
    return Math.min(res.amount - (res.arrivedAmount + manager.store[res.resType] || 0), 0)
}

/**
 * 统一处理获取能量操作的返回值
 */
const handleGetResourceRetureCode = function (
    retureCode: ScreepsReturnCode,
    managerData: ManagerData,
    targetRes: TransportRequestData,
    manager: Creep,
    requireFinishTask: (reason: TaskFinishReason) => void
) {
    if (retureCode === OK) {
        if (!managerData.carry) managerData.carry = []
        managerData.carry.push(targetRes.resType)
        if (!targetRes.managerName) targetRes.managerName = manager.name
    }
    // 拿不下了就运过去
    else if (retureCode === ERR_FULL) {
        managerData.state = ManagerState.PutResource
        return
    }
    else if (retureCode === ERR_NOT_ENOUGH_RESOURCES) {
        requireFinishTask(TaskFinishReason.NotEnoughResource)
        manager.log(`执行搬运任务是出现资源不足问题： ${JSON.stringify(targetRes)}`)
    }
    else {
        manager.log(`物流任务获取资源出错！${retureCode} ${JSON.stringify(targetRes)}`)
    }
}