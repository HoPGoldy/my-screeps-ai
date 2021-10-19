import { SquadType } from "../squadManager/types";
import { MobilizeState, WarMemory } from "../types";

export const createMemoryAccessor = (getMemory: () => WarMemory) => ({
    updateMobilizeState(mobilizeCode: string, newState: MobilizeState) {
        const memory = getMemory()
        if (!(mobilizeCode in memory.mobilizes)) return false
        memory.mobilizes[mobilizeCode].state = newState
    },
    querySquad(code: string) {
        const memory = getMemory()
        return memory.squads[code]
    },
    queryMobilize(code: string) {
        const memory = getMemory()
        return memory.mobilizes[code]
    },
    insertSquad(squadType: SquadType, memberNames: string[], squadCode: string): void {
        const memory = getMemory()
        memory.squads[squadCode] = {
            code: squadCode,
            type: squadType,
            cacheTargetFlagName: '',
            data: {},
            memberNames
        }
    },
    insertMobilizeTask(squadType: SquadType, needBoost: boolean, squadCode: string): void {
        const memory = getMemory()
        memory.mobilizes[squadCode] = {
            state: MobilizeState.WaitBoostPrepare,
            squadCode,
            squadType,
            needBoost
        }
    },
    insertAlonedCreep(creepNames: string[]) {
        const memory = getMemory()
        memory.alonedCreep = _.uniq([...memory.alonedCreep, ...creepNames])
    }
})
