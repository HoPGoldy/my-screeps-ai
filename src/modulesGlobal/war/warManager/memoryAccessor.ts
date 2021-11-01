import { MobilizeState } from "../mobilizeManager/types";
import { SquadType } from "../squadManager/types";
import { WarMemory, WarState } from "../types";

export const createMemoryAccessor = (getMemory: () => WarMemory) => ({
    querySquad(code: string) {
        const memory = getMemory()
        return memory.squads[code]
    },
    /**
     * 获取当前正在处理的动员任务
     */
    queryCurrentMobilizeTask() {
        const memory = getMemory()
        if (!memory.mobilizes) memory.mobilizes = []
        return memory.mobilizes[0]
    },
    /**
     * 移除当前正在处理的动员任务
     */
    deleteCurrentMobilizeTask() {
        const memory = getMemory()
        memory.mobilizes.shift()
    },
    insertSquad(squadType: SquadType, memberNames: string[], suqadTarget: string, squadCode: string): void {
        const memory = getMemory()
        memory.squads[squadCode] = {
            code: squadCode,
            target: suqadTarget,
            type: squadType,
            data: {},
            memberNames
        }
    },
    insertMobilizeTask(squadType: SquadType, needBoost: boolean, suqadTarget: string, squadCode: string): void {
        const memory = getMemory()
        if (!memory.mobilizes) memory.mobilizes = []

        memory.mobilizes.push({
            state: needBoost ? MobilizeState.WaitBoostPrepare : MobilizeState.Spawning,
            squadCode,
            suqadTarget,
            squadType,
            needBoost,
            data: {}
        })
    },
    updateState(newState: WarState) {
        const memory = getMemory()
        memory.state = newState
    },
    insertAlonedCreep(creepNames: string[]) {
        const memory = getMemory()
        memory.alonedCreep = _.uniq([...memory.alonedCreep, ...creepNames])
    },
    deleteSquad(squadCode: string) {
        const memory = getMemory()
        delete memory.squads[squadCode]
    }
})
