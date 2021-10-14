import { createMemoryAccessor } from './memoryAccessor'
import { BaseEffects, WarManager, WarMemory, WarModuleMemory, WarState } from './types'
import { createWarManager } from './warManager/warManager'

export type CreateEffects = {
    getMemory: () => WarModuleMemory
} & BaseEffects

export const createWarModule = function (opts: CreateEffects) {
    const warProcesses: { [warCode: string]: WarManager } = {}

    const { queryWarCodes, queryWarMemory, insertWarMemory, queryDefaultSquad, updateDefaultSquad } = createMemoryAccessor(opts.getMemory)

    const createWarEffect = function (warCode: string) {
        return {
            ...opts,
            getWarMemory: () => queryWarMemory(warCode)
        }
    }

    const start = function (spawnRoomName: string, warCode: string) {
        const warMemory: WarMemory = {
            code: warCode,
            state: WarState.Progress,
            spawnRoomName,
            squads: {},
            mobilizes: {}
        }

        insertWarMemory(warMemory)
        warProcesses[warCode] = createWarManager(createWarEffect(warCode))
        // warProcesses[warCode].addSquad()
    }

    const setDefault = function () {

    }

    const initWarManager = function () {
        const warCodes = queryWarCodes()

        warCodes.forEach(code => {
            warProcesses[code] = createWarManager(createWarEffect(code))
        })
    }

    const run = function () {
        Object.values(warProcesses).forEach(process => process.run())
    }

    return { start, setDefault, run, initWarManager }
}
