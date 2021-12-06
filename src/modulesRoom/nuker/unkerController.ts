import { useFillNuker } from './hooks/useFillNuker'
import { usePlanNuker } from './hooks/usePlanNuker'
import { NukerContext } from './types'

export const createNukerController = function (context: NukerContext) {
    const { mountToGlobal } = usePlanNuker(context)

    const lazyLoader = function (roomName: string) {
        return useFillNuker(roomName, context)
    }

    return { mountNuker: mountToGlobal, lazyLoader }
}

export type NukerController = ReturnType<ReturnType<typeof createNukerController>['lazyLoader']>
