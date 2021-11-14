import { TransportWorkContext } from "../types"

export const onDeathClear = (context: TransportWorkContext) => {
    const { manager, workRoom } = context

    if (manager.store.getUsedCapacity() <= 0) {
        manager.suicide()
        return
    }

    for (const resourceType in manager.store) {
        let target: StructureWithStore

        // 不是能量就放到 terminal 里
        if (resourceType != RESOURCE_ENERGY && resourceType != RESOURCE_POWER && workRoom.terminal) {
            target = workRoom.terminal
        }
        // 否则就放到 storage
        else target = workRoom.storage
        // 刚开新房的时候可能会没有存放的目标
        if (!target) return false

        // 转移资源
        manager.goTo(target.pos)
        manager.transfer(target, resourceType as ResourceConstant)

        return false
    }
}
