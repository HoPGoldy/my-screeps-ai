import { createCache } from '@/utils'
import { useFillNuker } from './hooks/useFillNuker'
import { usePlanNuker } from './hooks/usePlanNuker'
import { NukerContext } from './types'

export const createNukerController = function (context: NukerContext) {
    const { mountToGlobal } = usePlanNuker(context)

    const lazyLoader = function (roomName: string) {
        return useFillNuker(roomName, context)
    }

    const [getNukerController] = createCache(lazyLoader)
    return { mountNuker: mountToGlobal, getNukerController }
}

export type NukerController = ReturnType<ReturnType<typeof createNukerController>['getNukerController']>
