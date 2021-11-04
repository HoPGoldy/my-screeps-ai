import { allBattleCore } from "../battleCore"
import { SquadMemory, WarState } from "../types"
import { EnvContext } from "@/contextTypes"
import { contextCostMatrix, contextEnemyDamage, contextRoomInfo } from "../context"

type SquadContext = {
    warCode: string
    squadCode: string
    getMemory: () => SquadMemory
    getWarState: () => WarState
    dismiss: (aliveCreeps: Creep[]) => void
} & EnvContext

export const createSquadManager = function (context: SquadContext) {
    const {
        getMemory, getWarState, squadCode, warCode, env, dismiss
    } = context

    const getRoomInfo = contextRoomInfo.use()
    const getCostMatrix = contextCostMatrix.use()
    const getEnemyDamage = contextEnemyDamage.use()

    /**
     * 执行小队行动
     */
    const run = function () {
        const { memberNames, type, data }= getMemory()
        const warState = getWarState()

        // 获取本小队的所有成员
        const members = memberNames.map(env.getCreepByName).filter(Boolean)
        // 有成员死掉了，上报解散小队
        if (members.length < memberNames.length) {
            dismiss(members)
            return
        }

        const targetFlag = getTargetFlag()

        // 获取并运行战斗核心
        const runBattleCore = allBattleCore[type]
        if (!runBattleCore) {
            env.log.error(`${squadCode} 小队：未知的小队类型 ${type}，找不到对应的战斗核心`)
            return
        }

        runBattleCore({
            members, memory: data, warState, targetFlag,
            getRoomInfo, getBaseCost: getCostMatrix, getEnemyDamage,
            env
        })
    }

    /**
     * 判断一个旗帜是否可以当作目标
     */
    const useFlagAsTarget = function (flag: Flag) {
        if (!flag) return false

        // 抵达了，这个目标就完成了，删除
        if (hasMyCreep(flag)) {
            flag.remove()
            env.log.success(`${squadCode} 小队已抵达旗帜 ${flag.name}`)
            return false
        }

        // 没有抵达，这个就是目标
        return true
    }

    /**
     * 获取当前行动的目标旗帜
     * 这里不应该缓存旗帜名，不然会出现新建了路径点，但是小队没有立刻响应的情况出现
     */
    const getTargetFlag = function (): Flag {
        const { target: squadFlagCode } = getMemory()
        // 优先选择小队代号对应的旗帜
        const codeFlag = env.getFlagByName(squadFlagCode)
        if (useFlagAsTarget(codeFlag)) return codeFlag

        // 找不到再找有没有路径点
        for (let i = 0; i <= 10; i++) {
            const flag = env.getFlagByName(squadFlagCode + i)
            if (useFlagAsTarget(codeFlag)) return flag
        }

        // 小队没有路径点，把战争旗帜当作目标
        return env.getFlagByName(warCode)
    }

    /**
     * 危险操作！
     * 将会杀掉所有小队成员并移除相关旗帜
     */
    const close = function () {
        const { memberNames } = getMemory()
        memberNames.map(env.getCreepByName).map(creep => creep?.suicide())

        // 移除旗帜
        const codeFlag = env.getFlagByName(squadCode)
        if (codeFlag) codeFlag.remove()

        for (let i = 0; i <= 10; i++) {
            const flag = env.getFlagByName(squadCode + i)
            if (flag) flag.remove()
        }
    }

    /**
     * 返回当前小队状态
     */
    const showState = function () {
        const { memberNames } = getMemory()
        const targetFlag = getTargetFlag()
        return `[小队 ${squadCode}] [队员] ${memberNames.join(',')} [目标旗帜] ${targetFlag?.name || '???'}`
    }

    return { run, close, showState }
}

export type SquadManager = ReturnType<typeof createSquadManager>

/**
 * 检查指定旗帜是否有自己人抵达了
 */
export const hasMyCreep = function (flag: Flag) {
    return flag.pos.lookFor(LOOK_CREEPS).find(c => c.my)
}