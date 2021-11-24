import { StructureWithStore } from '@/utils'
import { ManagerState, TransportWorkContext } from '../types'

/**
 * manager 触发后事处理的最小生命
 */
export const TRANSFER_DEATH_LIMIT = 20

export const onDeathClear = (context: TransportWorkContext) => {
    const { manager, workRoom, managerData } = context

    if (manager.ticksToLive > TRANSFER_DEATH_LIMIT) {
        managerData.state = ManagerState.ClearRemains
        return
    }

    if (manager.store.getUsedCapacity() <= 0) {
        Object.keys(managerData).forEach(key => delete managerData[key])
        manager.suicide()
        return
    }

    const firstResource = Object.keys(manager.store)[0] as ResourceConstant
    let target: StructureWithStore

    // 不是能量就放到 terminal 里
    if (firstResource !== RESOURCE_ENERGY && firstResource !== RESOURCE_POWER && workRoom.terminal) {
        target = workRoom.terminal
    }
    // 否则就放到 storage
    else target = workRoom.storage
    // 刚开新房的时候可能会没有存放的目标
    if (!target) return false

    // 转移资源
    manager.goTo(target.pos)
    manager.transfer(target, firstResource)
}
