import { ManagerActionStrategy, ManagerState, TransportContext } from '../types'

export const useClearRemains = function (context: TransportContext): ManagerActionStrategy {
    const { goTo } = context

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
        goTo(creep, structure.pos)
        creep.transfer(structure, resType, transferAmount)
        return true
    }

    return (workContext) => {
        const { manager, workRoom, managerData } = workContext

        // 检查身上的资源，不是这个任务的就放起来
        for (const resType in manager.store) {
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
    }
}
