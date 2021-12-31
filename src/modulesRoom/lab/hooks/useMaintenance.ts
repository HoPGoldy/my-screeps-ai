import { LabContext, LabState } from '../types'
import { LabAccessor } from '../labAccessor'
import { LabMemoryAccessor } from '../memory'
import { LAB_TARGETS } from '../constants'

export const useMaintenance = function (roomName: string, context: LabContext, db: LabMemoryAccessor, labAccessor: LabAccessor) {
    const { getMemory, env, getResourceAmount } = context
    const { initLabInfo, getInLabs } = labAccessor

    /**
     * 设置底物存放 lab
     * @param labA 第一个底物存放 lab
     * @param labB 第二个底物存放 lab
     */
    const setBaseLab = function (labA: StructureLab, labB: StructureLab): void {
        db.updateInLab(labA, labB)
        initLabInfo()
        db.resumeLab()
    }

    /**
     * 显示当前 lab 运行状态
     */
    const show = function (): string {
        const room = env.getRoomByName(roomName)
        const memory = getMemory(room)
        const { reactionState, reactionIndex, pause, reactionAmount, boostTasks = [], inLab: inLabIds = [] } = memory
        const { yellow, blue } = env.colorful
        const logs = ['[化合物合成]']
        const inLabs = getInLabs()

        const reactionLogs = []
        if (inLabs.length < 2) {
            if (inLabIds.length >= 2) {
                if (inLabs.length >= 2) reactionLogs.push(yellow('底物 lab 被 boost 任务借用，暂停反应'))
                else reactionLogs.push(yellow('底物 lab 不足，暂停反应'))
            }
            else reactionLogs.push(yellow('未设置底物 lab，暂未启用'))
        }
        else {
            if (pause) reactionLogs.push(yellow('暂停中'))
            reactionLogs.push(`- [状态] ${reactionState}`)

            if (reactionState === LabState.GetTarget) {
                const targetLogs = LAB_TARGETS.map(({ target, number }, index) => {
                    let log = `- [待选目标] ${blue(target)} [目标数量] ${blue(number)}`
                    if (reactionIndex === index) log += ' <= 正在检查'
                    return log
                })
                logs.push(targetLogs.join('\n'))
            }
            else if (reactionState === LabState.GetResource) {
                const res = LAB_TARGETS[reactionIndex]
                logs.push(`- [正在获取资源] ${blue(res.target)} 目标合成数量 ${reactionAmount}`)
            }
            // 在工作就显示工作状态
            else if (reactionState === LabState.Working) {
                // 获取当前目标产物以及 terminal 中的数量
                const res = LAB_TARGETS[reactionIndex]
                const currentAmount = getResourceAmount(room, res.target)
                logs.push(
                    `- [工作进展] 目标 ${res.target} 本次生产/当前存量/目标存量 ` +
                    `${reactionAmount}/${currentAmount}/${res.number}`
                )
            }
            else if (reactionState === LabState.PutResource) {
                const res = LAB_TARGETS[reactionIndex]
                logs.push(`- [正在移出资源] ${blue(res.target)}`)
            }
        }
        logs.push(reactionLogs.join(' '))

        logs.push('[强化任务]')

        if (boostTasks.length === 0) logs.push('- 暂无任务')
        else {
            const taskLogs = boostTasks.map(task => {
                const info = `- [${task.id}] [当前阶段] ${task.state} `
                const resLog = task.res.map(res => `[${res.resource}] ${res.amount}`).join(' ')
                return info + resLog
            })

            logs.push(...taskLogs)
        }

        return logs.join('\n')
    }

    return { setBaseLab, on: db.resumeLab, off: db.pauseLab, show }
}
