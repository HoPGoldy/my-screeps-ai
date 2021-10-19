import { allBattleCore } from "../battleCore"
import { ContextGetCostMatrix, ContextGetRoomInfo, SquadMemory } from "../types"
import { ContextGetCreepByName, ContextGetFlagByName, ContextLog } from "@/contextTypes"

type SquadContext = {
    warCode: string
    squadCode: string
    getMemory: () => SquadMemory
    dismiss: (aliveCreeps: Creep[]) => void
} & ContextGetCostMatrix & ContextGetRoomInfo & ContextGetFlagByName & ContextGetCreepByName & ContextLog

export const createSquadManager = function (context: SquadContext) {
    const {
        getMemory, squadCode, warCode, log, dismiss, getRoomInfo,
        getCreepByName, getFlagByName, getCostMatrix, colors
    } = context

    /**
     * 执行小队行动
     */
    const run = function () {
        const { memberNames, type, data }= getMemory()

        // 获取本小队的所有成员
        const members = memberNames.map(getCreepByName).filter(Boolean)
        // 有成员死掉了，上报解散小队
        if (members.length < memberNames.length) {
            dismiss(members)
            return
        }

        const targetFlag = getTargetFlag()

        // 获取并运行战斗核心
        const runBattleCore = allBattleCore[type]
        if (!runBattleCore) {
            log(`未知的小队类型 ${type}，找不到对应的战斗核心`, ['小队', squadCode], colors.Red)
            return
        }

        runBattleCore({ members, memory: data, targetFlag, getRoomInfo, getBaseCost: getCostMatrix })
    }

    /**
     * 获取当前行动的目标旗帜
     */
    const getTargetFlag = function (): Flag {
        const memory = getMemory()
        const cacheFlag = getFlagByName(memory.cacheTargetFlagName)

        if (cacheFlag) {
            if (!hasMyCreep(cacheFlag)) return cacheFlag
            delete memory.cacheTargetFlagName
        }

        for (let i = 0; i <= 10; i++) {
            const flag = getFlagByName(squadCode + i)
            if (!flag) continue

            // 抵达了，这个目标就完成了，删除
            if (hasMyCreep(flag)) {
                flag.remove()
                log(`已抵达旗帜 ${flag.name}`, ['小队', squadCode], colors.Green)
                continue
            }

            // 没有抵达，这个就是目标
            memory.cacheTargetFlagName = flag.name
            return flag
        }

        // 小队没有路径点，把战争旗帜当作目标
        memory.cacheTargetFlagName = warCode
        return getFlagByName(warCode)
    }

    /**
     * 返回当前小队状态
     */
    const showState = function () {
        const { memberNames, cacheTargetFlagName } = getMemory()
        return `[小队 ${squadCode}] [队员] ${memberNames.join(',')} [目标旗帜] ${cacheTargetFlagName}`
    }

    return { run, showState }
}

export type SquadManager = ReturnType<typeof createSquadManager>

/**
 * 检查指定旗帜是否有自己人抵达了
 */
const hasMyCreep = function (flag: Flag) {
    return flag.pos.lookFor(LOOK_CREEPS).find(c => c.my)
}