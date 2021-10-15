import { createCacheAccessor } from './cacheAccessor'
import { createMemoryAccessor } from './memoryAccessor'
import { BaseEffects, SquadType, WarManager, WarMemory, WarModuleMemory, WarState } from './types'
import { createWarManager } from './warManager/warManager'

export type CreateEffects = {
    getMemory: () => WarModuleMemory
} & BaseEffects

export const createWarModule = function (opts: CreateEffects) {
    const warProcesses: { [warCode: string]: WarManager } = {}
    const db = createMemoryAccessor(opts.getMemory)
    const { getCostMatrix, setCostMatrix, refresh: refreshCache } = createCacheAccessor()

    const createWarEffect = function (warCode: string) {
        return {
            ...opts,
            getCostMatrix,
            setCostMatrix,
            getWarMemory: () => db.queryWarMemory(warCode)
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

        db.insertWarMemory(warMemory)
        warProcesses[warCode] = createWarManager(createWarEffect(warCode))

        // 有设置默认小队的话就直接添加动员任务
        const defaultSquad = db.queryDefaultSquad()
        if (defaultSquad) warProcesses[warCode].addMobilize(...defaultSquad)
    }

    const setDefault = function (squadType: SquadType, needBoost: boolean, squadCode: string) {
        db.updateDefaultSquad(squadType, needBoost, squadCode)
    }

    const initWarManager = function () {
        const warCodes = db.queryWarCodes()

        warCodes.forEach(code => {
            warProcesses[code] = createWarManager(createWarEffect(code))
        })
    }

    const run = function () {
        refreshCache()
        Object.values(warProcesses).forEach(process => process.run())
    }

    return { start, setDefault, run, initWarManager, clearDefault: db.deleteDefaultSquad }
}
