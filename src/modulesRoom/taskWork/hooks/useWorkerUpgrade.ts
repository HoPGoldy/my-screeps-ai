import { getEngryFrom } from '@/utils/creep'
import { WorkTaskContext, WorkerActionStrategy, WorkerGetEnergy, WorkerRuntimeContext } from '../types'

export const useWorkerUpgrade = function (
    context: WorkTaskContext,
    getEnergy: WorkerGetEnergy,
    getWorkController: WorkerRuntimeContext
): WorkerActionStrategy {
    const { goTo } = context

    return {
        source: (creep, task, workRoom) => {
            if (creep.store[RESOURCE_ENERGY] > 10) return true

            // 优先使用 upgrade Link 的能量
            const upgradeLink = workRoom.linkController.getUpgradeLink()
            if (upgradeLink && upgradeLink.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                getEngryFrom(creep, upgradeLink)
                getWorkController(workRoom).countWorkTime()
                return false
            }

            return getEnergy(creep, task, workRoom)
        },
        target: (creep, task, workRoom) => {
            getWorkController(workRoom).countWorkTime()
            const result = creep.upgradeController(workRoom.controller)

            if (result === ERR_NOT_IN_RANGE) goTo(creep, workRoom.controller.pos)
            else if (result === ERR_NOT_ENOUGH_RESOURCES) {
                delete task.cacheSourceId
                return true
            }

            return false
        }
    }
}
