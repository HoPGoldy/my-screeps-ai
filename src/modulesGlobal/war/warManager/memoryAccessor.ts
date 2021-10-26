import { MobilizeState } from "../mobilizeManager/types";
import { SquadType } from "../squadManager/types";
import { WarMemory } from "../types";

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
        if (!(memory.mobilizing in memory.mobilizes)) {
            memory.mobilizing = Object.keys(memory.mobilizes)[0]
            if (!memory.mobilizing) return undefined
        }

        return memory.mobilizes[memory.mobilizing]
    },
    /**
     * 移除当前正在处理的动员任务
     */
    deleteCurrentMobilizeTask() {
        const memory = getMemory()
        if (memory.mobilizing in memory.mobilizes) delete memory.mobilizes[memory.mobilizing]
        delete memory.mobilizing
    },
    insertSquad(squadType: SquadType, memberNames: string[], suqadTarget: string, squadCode: string): void {
        const memory = getMemory()
        memory.squads[squadCode] = {
            code: squadCode,
            target: suqadTarget,
            type: squadType,
            cacheTargetFlagName: '',
            data: {},
            memberNames
        }
    },
    insertMobilizeTask(squadType: SquadType, needBoost: boolean, suqadTarget: string, squadCode: string): void {
        const memory = getMemory()
        memory.mobilizes[squadCode] = {
            state: needBoost ? MobilizeState.WaitBoostPrepare : MobilizeState.Spawning,
            squadCode,
            suqadTarget,
            squadType,
            needBoost,
            data: {}
        }
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
