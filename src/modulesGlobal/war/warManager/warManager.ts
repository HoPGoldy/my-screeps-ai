import { ContextGetCostMatrix, ContextGetRoomInfo, WarMemory } from "../types"
import { createMobilizeManager } from "../mobilizeManager/mobilizeManager"
import { createMemoryAccessor } from "./memoryAccessor"
import { createSquadManager } from "../squadManager/squadManager"
import { EnvContext } from "@/contextTypes"
import { arrayToObject, createCluster } from "@/utils"
import { SquadType, SquadTypeName } from "../squadManager/types"

export type WarContext = {
    warCode: string
    getWarMemory: () => WarMemory
} & ContextGetCostMatrix & ContextGetRoomInfo & EnvContext

export const createWarManager = function (context: WarContext) {
    const { getWarMemory, env, warCode } = context
    const { spawnRoomName } = getWarMemory()
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

    const squadCluster = createCluster(initSquad)
    const mobilizeManager = createMobilizeManager({
        getMemory: db.queryCurrentMobilizeTask,
        getSpawnRoom: () => env.getRoomByName(spawnRoomName),
        finishTask: (creeps) => {
            db.deleteCurrentMobilizeTask()
            console.log('动员任务完成', creeps)
        },
        abandonTask: reason => {
            const task = db.queryCurrentMobilizeTask()
            env.log.warning(`动员任务 ${SquadTypeName[task.squadType]} ${task.squadCode} 已停止：` + reason)
            db.deleteCurrentMobilizeTask()
        },
        ...context
    })

    /**
     * 新建小队
     * 
     * @param type 小队类型
     * @param members 小队成员
     * @param code 小队代号
     */
    const addSquad = function (type: SquadType, members: Creep[], code: string) {
        /**
         * @todo 多个小队怎么同时进攻一个旗帜
         */
        db.insertSquad(type, members.map(c => c.name), code)

        const newSquad = createSquadManager({
            warCode,
            squadCode: code,
            getMemory: () => db.querySquad(code),
            dismiss: aliveCreeps => dismissSquad(code, aliveCreeps),
            ...context
        })

        squadCluster.add(code, newSquad)
    }

    /**
     * 解散指定小队
     * 
     * @param squadCode 要解散的小队代号
     * @param aliveCreeps 剩余的小队成员
     */
    const dismissSquad = function (squadCode: string, aliveCreeps: Creep[]) {
        squadCluster.remove(squadCode)
        db.deleteSquad(squadCode)
        db.insertAlonedCreep(aliveCreeps.map(c => c.name))
    }

    /**
     * 尝试从散兵里重建小队
     */
    const regroup = function () {
        const { alonedCreep } = getWarMemory()
        console.log('尝试组建小队！', alonedCreep)
    }

    /**
     * 返回当前战争进程状态
     */
    const showState = function () {
        const squadState = squadCluster.showState()
        const mobilizeState = mobilizeManager.showState()

        const { mobilizes } = getWarMemory()

        return [
            `${warCode} 战争情况`,
            '战斗小队',
            ...squadState.map(s => '- ' + s),
            '动员任务',
            ' ' + mobilizeState,
            '待执行动员任务',
            ...Object.values(mobilizes).map(task => `- [小队代号] ${task.squadCode} [小队类型] ${SquadTypeName[task.squadType]}`)
        ].join('\n')
    }

    /**
     * 执行战争行动
     */
    const run = function () {
        mobilizeManager.run()
        squadCluster.run()

        regroup()
    }

    return { run, showState, addSquad, dismissSquad, addMobilize: db.insertMobilizeTask }
}

export type WarManager = ReturnType<typeof createWarManager>