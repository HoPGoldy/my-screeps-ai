import { ContextGetCostMatrix, ContextGetRoomInfo, WarMemory } from "../types"
import { createMobilizeManager } from "../mobilizeManager/mobilizeManager"
import { createMemoryAccessor } from "./memoryAccessor"
import { createSquadManager } from "../squadManager/squadManager"
import { EnvContext } from "@/contextTypes"
import { arrayToObject, createCluster } from "@/utils"
import { SquadType, SquadTypeName } from "../squadManager/types"
import { DEFAULT_SQUAD_CODE } from "../utils"

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
            const { squadCode, suqadTarget, squadType } = db.queryCurrentMobilizeTask()
            addSquad(squadType, creeps, suqadTarget, squadCode)
            env.log.success(`动员任务 ${SquadTypeName[squadType]} ${squadCode} 已完成`)
            db.deleteCurrentMobilizeTask()
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
     * @param targetFlagName 要进攻的旗帜名
     * @param code 小队代号
     */
    const addSquad = function (type: SquadType, members: Creep[], targetFlagName: string, code: string) {
        db.insertSquad(type, members.map(c => c.name), targetFlagName, code)

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
     * 新增动员任务
     * 
     * @param type 要孵化的小队类型
     * @param needBoost 是否需要 boost
     * @param targetFlagName 要进攻的旗帜名
     * @param squadCode 小队代号
     */
    const addMobilize = function (type: SquadType, needBoost: boolean = true, targetFlagName?: string, squadCode?: string) {
        let confirmSquadCode = squadCode
        // 没有指定小队代号的话就挑选一个默认的
        if (!confirmSquadCode) {
            const { squads } = getWarMemory()
            const usedSquadCode = Object.keys(squads)
            confirmSquadCode = DEFAULT_SQUAD_CODE.find(code => !usedSquadCode.includes(code))
            if (!confirmSquadCode) {
                env.log.warning('默认小队代号已用尽，请手动执行小队代号')
                return
            }
        }

        let confirmTarget = targetFlagName
        // 目标旗帜未确认的话就使用小队代号的首字母当作旗帜名
        if (!confirmTarget) confirmSquadCode = confirmSquadCode[0]

        env.log.success(`小队 ${confirmSquadCode} 已被添加至动员队列，小队类型 ${SquadTypeName[type]} 进攻旗帜名 ${targetFlagName}`)
        db.insertMobilizeTask(type, needBoost, confirmTarget, confirmSquadCode)
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

    return { run, showState, addSquad, dismissSquad, addMobilize }
}

export type WarManager = ReturnType<typeof createWarManager>