import { createRoleController } from '@/modulesRoom/unitControl/controller'
import { calcBodyPart, createMemoryGetter } from '@/utils'
import { PbHarvestState } from '../constants'
import { ObserverContext, PbAttackerMemory } from '../types'
import { ReleasePbCarrier } from './usePbCarrier'
import { PbHealer, ReleasePbHealer } from './usePbHealer'

export const getPbAttackerName = (flagName: string, index: number) => `${flagName} attacker${index}`

/**
 * PowerBank 攻击单位
 * 移动并攻击 powerBank, 请在 8 级时生成
 */
export const usePbAttacker = function (
    context: ObserverContext,
    pbHealer: PbHealer,
    releasePbHealer: ReleasePbHealer,
    releasePbCarrier: ReleasePbCarrier
) {
    const { env, getMemory, pbAttackerRole, addSpawnTask, addSpawnCallback, onCreepStageChange } = context

    /**
     * pbAttacker 移除自身采集小组的封装
     *
     * @param creep pbAttacker
     * @param healerName 治疗单位名称
     * @param spawnRoom 出生房间
     */
    const removeSelfGroup = function (creep: Creep, healerName: string, spawnRoom: Room): void {
        pbHealer.removeUnit(spawnRoom, healerName, { immediate: true })
        pbAttacker.removeUnit(spawnRoom, creep.name, { immediate: true })
    }

    const pbAttacker = createRoleController<PbAttackerMemory>({
        getMemory: createMemoryGetter(getMemory, 'pbAttacker', {}),
        // healer 会一直生成，直到 attacker 通知移除
        onCreepDead: (creepName, memory, spawnRoom) => {
            // 把内存里的数据传递给下一代，节省重新搜索的消耗
            releasePbAttacker(spawnRoom, creepName, memory.sourceFlagName, memory.healerCreepName, memory)
        },
        runPrepare: (creep, memory, spawnRoom) => {
            const { sourceFlagName, healerCreepName, pbId } = memory

            const targetFlag = env.getFlagByName(sourceFlagName)
            if (!targetFlag) {
                creep.say('旗呢？')
                // 移除采集小组
                removeSelfGroup(creep, healerCreepName, spawnRoom)
                return false
            }

            // 朝目标移动
            creep.goTo(targetFlag.pos, { range: 1, checkTarget: false })

            let findPowerbank = true
            // 进入房间后搜索 pb 并缓存
            if (creep.room.name === targetFlag.pos.roomName) {
                // 有缓存了就验证下
                if (pbId) {
                    const pb = env.getObjectById(pbId)
                    if (!pb) findPowerbank = false
                }
                // 没缓存就查找 pb
                else {
                    const powerbank = _.find(targetFlag.pos.lookFor(LOOK_STRUCTURES), s => s.structureType === STRUCTURE_POWER_BANK) as StructurePowerBank
                    // 并写入缓存
                    if (powerbank) memory.pbId = powerbank.id
                    // 没找到说明已经没了
                    else findPowerbank = false
                }
            }

            // 没找到目标，任务失败
            if (!findPowerbank) {
                targetFlag.remove()
                // 移除采集小组
                removeSelfGroup(creep, healerCreepName, spawnRoom)
                return false
            }

            // 如果到了就算准备完成
            if (creep.pos.isNearTo(targetFlag.pos)) {
                onCreepStageChange(creep, true)
                // 检查下是否还没统计移动所需时间
                if (!memory.travelTime) memory.travelTime = CREEP_LIFE_TIME - creep.ticksToLive
                return true
            }

            return false
        },
        runTarget: (creep, memory, spawnRoom) => {
            const { sourceFlagName, healerCreepName, pbId, travelTime } = memory

            const targetFlag = env.getFlagByName(sourceFlagName)
            if (!targetFlag) {
                removeSelfGroup(creep, healerCreepName, spawnRoom)
                return false
            }

            // 获取 pb
            let powerbank: StructurePowerBank
            if (pbId) powerbank = env.getObjectById(pbId)
            else {
                // 没有缓存就进行查找
                powerbank = _.find(targetFlag.pos.lookFor(LOOK_STRUCTURES), s => s.structureType === STRUCTURE_POWER_BANK) as StructurePowerBank
                // 并写入缓存
                if (powerbank) memory.pbId = powerbank.id
            }

            // 找不到 pb 了
            if (!powerbank) {
                // 如果搬运小队已经在路上了，就进入搬运阶段
                if (targetFlag.memory.state === PbHarvestState.Prepare) {
                    targetFlag.memory.state = PbHarvestState.Transfer
                }
                // 未能成功在 pb 消失前将其摧毁，任务失败，移除旗帜
                else targetFlag.remove()

                // 移除采集小组
                removeSelfGroup(creep, healerCreepName, spawnRoom)
                return false
            }

            const attackResult = creep.attack(powerbank)

            // 如果血量低于标准了，则通知运输单位进行提前生成
            if (attackResult === OK) {
                /**
                 * @danger 注意下面这个计算式是固定两组在采集时的准备时间计算，如果更多单位一起开采的话会出现 pb 拆完但是 manager 还没到位的情况发生
                 * 下面这个 150 是 pbCarrier 的孵化时间，50 为冗余时间，600 是 attacker 的攻击力，2 代表两组同时攻击
                 */
                if (
                    (targetFlag.memory.state !== PbHarvestState.Prepare) &&
                    (powerbank.hits <= (travelTime + 150 + 50) * 600 * 2)
                ) {
                    // 发布运输小组
                    // 下面这个 1600 是 [ CARRY: 32, MOVE: 16 ] 的 pbCarrier 的最大运输量
                    releasePbCarrier(spawnRoom, sourceFlagName, Math.ceil(powerbank.power / 1600))

                    // 设置为新状态
                    targetFlag.memory.state = PbHarvestState.Prepare
                }
            }
            else if (attackResult === ERR_NOT_IN_RANGE) creep.moveTo(powerbank)
        },
        onCreepStageChange
    })

    const body = calcBodyPart([[ATTACK, 20], [MOVE, 20]])

    /**
     * 发布 pb 进攻单位
     *
     * @param room 要孵化的房间
     * @param attackerCreepName 进攻单位的名字
     * @param healerCreepName 治疗自己的单位名字
     * @param sourceFlagName 要采集的 pb 旗帜名
     * @param otherData 要添加的其他数据
     */
    const releasePbAttacker = function (
        room: Room,
        attackerCreepName: string,
        healerCreepName: string,
        sourceFlagName: string,
        otherData: Partial<PbAttackerMemory> = {}
    ) {
        addSpawnTask(room, attackerCreepName, pbAttackerRole, body)
        pbAttacker.registerUnit(attackerCreepName, { ...otherData, sourceFlagName, healerCreepName }, room)
    }

    /**
     * 孵化 pb 采集小组（一红一绿为一组）
     *
     * @param sourceFlagName 要采集的旗帜名
     * @param groupNumber 【可选】发布的采集小组数量
     */
    const releasePbGroup = function (spawnRoom: Room, sourceFlagName: string, groupNumber = 2) {
        // 发布 attacker 和 healer，搬运者由 attacker 在后续任务中自行发布
        for (let i = 0; i < groupNumber; i++) {
            const attackerName = getPbAttackerName(sourceFlagName, i)
            const healerName = releasePbHealer(spawnRoom, attackerName)
            releasePbAttacker(spawnRoom, attackerName, healerName, sourceFlagName)
        }
    }

    addSpawnCallback(pbAttackerRole, pbAttacker.addUnit)

    return releasePbGroup
}
