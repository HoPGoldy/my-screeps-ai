import { ContextGetCostMatrix, ContextGetRoomInfo, WarMemory } from "../types"
import { createMobilizeManager } from "../mobilizeManager/mobilizeManager"
import { createMemoryAccessor } from "./memoryAccessor"
import { createSquadManager } from "../squadManager/squadManager"
import { ContextGetCreepByName, ContextGetFlagByName, ContextGetRoomByName, ContextLog } from "@/contextTypes"
import { arrayToObject, createCluster } from "@/utils"
import { SquadType } from "../squadManager/types"

export type WarContext = {
    warCode: string
    getWarMemory: () => WarMemory
} & ContextGetCostMatrix & ContextGetRoomInfo & ContextGetRoomByName & ContextGetFlagByName & ContextLog & ContextGetCreepByName

export const createWarManager = function (context: WarContext) {
    const { getWarMemory, getRoomByName, warCode } = context
    const db = createMemoryAccessor(getWarMemory)

    /**
     * 初始化所有小队
     */
    const initSquad = function () {
        const { squads } = getWarMemory()

        return arrayToObject(Object.entries(squads).map(([code]) => [code, createSquadManager({
            warCode,
            squadCode: code,
            getMemory: () => db.querySquad(code),
            dismiss: aliveCreeps => dismissSquad(code, aliveCreeps),
            ...context
        })]))
    }

    /**
     * 初始化所有动员任务
     */
    const initMobilize = function () {
        const { mobilizes, spawnRoomName } = getWarMemory()

        return arrayToObject(Object.entries(mobilizes).map(([code, task]) => [code, createMobilizeManager({
            getMemory: () => db.queryMobilize(code),
            getSpawnRoom: () => getRoomByName(spawnRoomName),
            updateState: newState => db.updateMobilizeState(task.squadCode, newState)
        })]))
    }

    const {
        add: addSquadProcess,
        remove: removeSquad,
        run: runAllSquadProcess,
        showState: showSquadState
    } = createCluster(initSquad)
    const {
        add: addMobilize,
        run: runAllMobilizeProcess,
        showState: showMobilizeState
    } = createCluster(initMobilize)

    /**
     * 新建小队
     * 
     * @param type 小队类型
     * @param members 小队成员
     * @param code 小队代号
     */
    const addSquad = function (type: SquadType, members: Creep[], code: string) {
        db.insertSquad(type, members.map(c => c.name), code)

        const newSquad = createSquadManager({
            warCode,
            squadCode: code,
            getMemory: () => db.querySquad(code),
            dismiss: aliveCreeps => dismissSquad(code, aliveCreeps),
            ...context
        })

        addSquadProcess(code, newSquad)
    }

    /**
     * 解散指定小队
     * 
     * @param squadCode 要解散的小队代号
     * @param aliveCreeps 剩余的小队成员
     */
    const dismissSquad = function (squadCode: string, aliveCreeps: Creep[]) {
        db.insertAlonedCreep(aliveCreeps.map(c => c.name))
    }

    /**
     * 尝试从散兵里重建小队
     */
    const regroup = function () {
        const { alonedCreep } = getWarMemory()
        console.log('尝试组建小队！', alonedCreep)
    }

    const showState = function () {
        const squadState = showSquadState()
        const mobilizeState = showMobilizeState()

        return [
            `${warCode} 战争情况`,
            '战斗小队',
            squadState.map(s => '- ' + s).join('\n'),
            '动员任务',
            mobilizeState.map(s => '- ' + s).join('\n')
        ].join('\n')
    }

    /**
     * 执行战争行动
     */
    const run = function () {
        runAllMobilizeProcess()
        runAllSquadProcess()

        regroup()
    }

    return { run, showState, addSquad, removeSquad, addMobilize: db.insertMobilizeTask }
}

export type WarManager = ReturnType<typeof createWarManager>