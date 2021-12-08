import { useBalanceTerminal } from './hooks/useBalanceTerminal'
import { useManageResource } from './hooks/useManageResource'
import { useStorageWork } from './hooks/useStorageWork'
import { StorageContext } from './types'
import { createCache } from '@/utils'

export const createStorageController = function (context: StorageContext) {
    const lazyLoader = function (roomName: string) {
        const workMethods = useStorageWork(roomName, context)
        const balanceMethods = useBalanceTerminal(roomName, context)
        const manageMethods = useManageResource(roomName, context)

        return { ...workMethods, ...balanceMethods, ...manageMethods }
    }

    const [getStorageController] = createCache(lazyLoader)
    return getStorageController
}

export type StorageController = ReturnType<ReturnType<typeof createStorageController>>
