import { WorkTaskContext, WorkerActionStrategy, WorkerGetEnergy, WorkerRuntimeContext } from '../types'

export const useWorkerUpgrade = function (
    context: WorkTaskContext,
    getEnergy: WorkerGetEnergy,
    getWorkController: WorkerRuntimeContext
): WorkerActionStrategy {
    return {
        source: (creep, task, workRoom) => {
            if (creep.store[RESOURCE_ENERGY] > 10) return true

            // 优先使用 upgrade Link 的能量
            const upgradeLink = workRoom.linkController.getUpgradeLink()
            if (upgradeLink && upgradeLink.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                creep.getEngryFrom(upgradeLink)
                getWorkController(workRoom).countWorkTime()
                return false
            }

            return getEnergy(creep, task, workRoom)
        },
        target: (creep, task, workRoom) => {
            getWorkController(workRoom).countWorkTime()
            if (creep.upgradeRoom(workRoom.name) === ERR_NOT_ENOUGH_RESOURCES) {
                delete task.cacheSourceId
                return true
            }

            return false
        }
    }
}
