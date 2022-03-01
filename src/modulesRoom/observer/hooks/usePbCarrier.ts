import { createRole } from '@/modulesRoom/unitControl/controller'
import { calcBodyPart, createMemoryGetter } from '@/utils'
import { PbHarvestState } from '../constants'
import { ObserverContext, PbCarrierMemory } from '../types'

export const getPbCarrierName = (flagName: string, index: number) => `${flagName} carrier${index}`

/**
 * PowerBank 运输单位
 * 搬运 PowerBank Ruin 中的 power, 请在 8 级时生成
 */
export const usePbCarrier = function (context: ObserverContext) {
    const {
        env, getMemory, addSpawnTask, pbCarrierRole, onPbTransferFinish, addSpawnCallback,
        onCreepStageChange, goTo
    } = context

    const pbCarrier = createRole<PbCarrierMemory>({
        getMemory: createMemoryGetter(getMemory, 'pbCarrier', {}),
        // carrier 并不会重复生成
        onCreepDead: (creepName, memory) => {
            const targetFlag = env.getFlagByName(memory.sourceFlagName)
            targetFlag?.remove()
        },
        // 移动到目标三格之内就算准备完成
        runPrepare: (creep, memory) => {
            const targetFlag = env.getFlagByName(memory.sourceFlagName)
            if (!targetFlag) {
                creep.suicide()
                return false
            }

            goTo(creep, targetFlag.pos, { checkTarget: false })

            return creep.pos.inRangeTo(targetFlag.pos, 3)
        },
        runSource: (creep, memory) => {
            const targetFlag = env.getFlagByName(memory.sourceFlagName)
            if (!targetFlag) {
                creep.suicide()
                return false
            }
            // 没到搬运的时候就先待命
            if (targetFlag.memory.state !== PbHarvestState.Transfer) return false
            // 到行动阶段了就过去
            goTo(creep, targetFlag.pos, { checkTarget: false })

            // 到房间里再进行下一步操作
            if (creep.room.name !== targetFlag.pos.roomName) return false

            // 获取 powerBank 的废墟
            const powerbankRuin = targetFlag.pos.lookFor(LOOK_RUINS)[0]

            // 如果 pb 废墟还存在
            if (powerbankRuin) {
                if (creep.withdraw(powerbankRuin, RESOURCE_POWER) === OK) return true
            }
            // 如果废墟没了就从地上捡
            else {
                const power = targetFlag.pos.lookFor(LOOK_RESOURCES)[0]
                return power && creep.pickup(power) === OK
            }
        },
        runTarget: (creep, memory, workRoom) => {
            // 获取资源运输目标房间并兜底
            if (!workRoom || !workRoom.terminal) {
                env.log.warning(`${creep.name} 找不到 ${workRoom.name} terminal`)
                return false
            }

            // 存放资源
            const result = creep.transfer(workRoom.terminal, RESOURCE_POWER)
            // 存好了就直接自杀并移除旗帜
            if (result === OK) {
                creep.suicide()
                onPbTransferFinish && onPbTransferFinish(workRoom)
                // 通知 terminal 进行 power 平衡
                // workRoom.terminalController.balancePower()

                return true
            }
            else if (result === ERR_NOT_IN_RANGE) {
                goTo(creep, workRoom.terminal.pos)
            }
        },
        onCreepStageChange
    })

    // 搬运单位的体系都是统一固定的
    const body = calcBodyPart([[CARRY, 32], [MOVE, 16]])

    /**
     * 发布 pbCarrier 小组
     * 由 pbAttacker 调用
     *
     * @param room 要孵化的房间
     * @param sourceFlagName 要采集的旗帜
     * @param number 要发布的数量
     */
    const releasePbCarrier = function (
        room: Room,
        sourceFlagName: string,
        number: number
    ) {
        for (let i = 0; i < number; i++) {
            const creepName = getPbCarrierName(sourceFlagName, i)
            addSpawnTask(room, creepName, pbCarrierRole, body)
            pbCarrier.registerUnit(creepName, { sourceFlagName }, room)
        }
    }

    addSpawnCallback(pbCarrierRole, pbCarrier.addUnit)

    return releasePbCarrier
}

export type ReleasePbCarrier = ReturnType<typeof usePbCarrier>
