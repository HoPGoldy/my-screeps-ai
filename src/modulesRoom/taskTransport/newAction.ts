import { TransportTaskData, ManagerData, ManagerState, TaskFinishReason } from "./types";

interface TransportWorkContext {
    workRoom: Room
    manager: Creep
    taskData: TransportTaskData
    managerData: ManagerData
    requireFinishTask: (task: TransportTaskData, reason: TaskFinishReason) => void
}

export const runManager = function (context: TransportWorkContext) {
    const { managerData } = context
    if (!managerData.state) managerData.state = ManagerState.ClearRemains

    stateRuners[managerData.state](context)
}

const stateRuners: { [state in ManagerState]: (context: TransportWorkContext) => void } = {
    // 清空身上的非任务资源，防止占用空间影响效率
    [ManagerState.ClearRemains]: context => {
        const { taskData, manager, workRoom, managerData } = context
        const taskResource = taskData.res.map(res => res.resType)

        // 遍历资源并检查是否需要清理
        for (const resType in manager.store) {
            if (taskResource.includes(resType as ResourceConstant)) continue

            // 先往 storage 运，不行就往终端运
            if (transferRes(manager, workRoom?.storage, resType as ResourceConstant)) return 
            if (transferRes(manager, workRoom?.terminal, resType as ResourceConstant)) return 

            if (resType === RESOURCE_ENERGY) {
                manager.drop(RESOURCE_ENERGY)
                return
            }

            // 资源比较贵重并且没地方放了,先带着
            continue
        }

        managerData.state = ManagerState.GetResource
    },
    // 从指定目标获取资源
    [ManagerState.GetResource]: context => {

    },
    // 把资源存放到指定目标
    [ManagerState.PutResource]: context => {

    },
}

/**
 * 转移资源到指定建筑
 * 
 * @param creep 携带资源的爬
 * @param structure 要运输到的目标
 * @param resType 要运输的资源类型
 * @returns 无法转移返回 false，正在转移返回 true
 */
const transferRes = function (creep: Creep, structure: StructureTerminal | StructureStorage, resType: ResourceConstant) {
    if (!structure) return false

    const storageFreeSpace = structure.store.getFreeCapacity() || 0
    if (storageFreeSpace <= 0) return false
    
    const transferAmount = Math.min(storageFreeSpace, creep.store[resType])
    creep.goTo(structure.pos)
    creep.transfer(structure, resType, transferAmount)
    return true
}