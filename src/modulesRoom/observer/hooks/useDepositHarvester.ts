import { createRoleController } from '@/modulesRoom/unitControl/controller'
import { createEnvContext, createMemoryGetter, createStaticBody } from '@/utils'
import { DepositHarvesterMemory, ObserverContext } from '../types'

export const getDepositHarvesterName = (flagName: string) => `${flagName} depoHarvester`

export const getDepositHarvesterBody = createStaticBody(
    [[WORK, 1], [CARRY, 1], [MOVE, 1]],
    [[WORK, 2], [CARRY, 2], [MOVE, 2]],
    [[WORK, 3], [CARRY, 3], [MOVE, 3]],
    [[WORK, 4], [CARRY, 6], [MOVE, 5]],
    [[WORK, 5], [CARRY, 9], [MOVE, 7]],
    [[WORK, 6], [CARRY, 10], [MOVE, 8]],
    [[WORK, 7], [CARRY, 15], [MOVE, 11]],
    [[WORK, 11], [CARRY, 15], [MOVE, 19]]
)

/**
 * deposit 采集者
 * 从指定沉积物中挖 deposit > 将挖出来的资源转移到建筑中
 */
export const useDepositHarvester = function (context: ObserverContext) {
    const { env, getMemory, depoMax, addSpawnTask, depositHarvesterRole, addSpawnCallback, onCreepStageChange } = context

    const depositHarvester = createRoleController<DepositHarvesterMemory>({
        getMemory: createMemoryGetter(getMemory, 'depositHarvester', {}),
        onCreepDead: (creepName, memory, workRoom) => {
            // 旗帜效验, 没有旗帜则不生成
            const targetFlag = env.getFlagByName(memory.sourceFlagName)
            if (!targetFlag) return

            // 冷却时长过长则放弃该 deposit
            if (memory.depositCooldown >= depoMax) {
                targetFlag.remove()
                return
            }

            releaseDepositHarvester(workRoom, memory.sourceFlagName, memory)
        },
        runSource: (creep, memory) => {
            const { sourceFlagName, depositCooldown, depositType, travelTime } = memory
            // 旗帜效验, 没有旗帜则原地待命
            const targetFlag = env.getFlagByName(sourceFlagName)
            if (!targetFlag) {
                creep.suicide()
                env.log.warning(`找不到名称为 ${sourceFlagName} 的旗帜，${creep.name} 已移除`)
                return false
            }

            // 如果采集满了 / 冷却时间太长 / 自己快死了，就往家跑
            if (
                (creep.store.getFreeCapacity(depositType) <= 0) ||
                depositCooldown >= 100 ||
                // 这里 travelTime * 2 的原因是 creep 身上带了 depo，移动力下降了
                (creep.ticksToLive <= (travelTime * 2) + 20)
            ) return true

            // 还没到就继续走
            if (!targetFlag.pos.isNearTo(creep.pos)) {
                // 边走边记录抵达时间
                if (travelTime === undefined) memory.travelTime = 0 // 初始化
                // 旅途时间还没有计算完成
                else if (!memory.travelComplete) memory.travelTime++ // 增量

                creep.goTo(targetFlag.pos, { range: 1, checkTarget: false })

                return false
            }
            // 完成旅途时间计算
            else memory.travelComplete = true

            // 获取目标
            let target: Deposit
            if (memory.sourceId) target = env.getObjectById(memory.sourceId)
            else {
                target = targetFlag.pos.lookFor(LOOK_DEPOSITS)[0]

                // 找到了就赋值并缓存
                if (target) memory.sourceId = target.id
                // 找不到就失去了存在的意义
                else {
                    targetFlag.remove()
                    creep.suicide()
                    return
                }
            }

            if (target.cooldown) return false

            const harvestResult = creep.harvest(target)
            // 采集成功更新冷却时间及资源类型
            if (harvestResult === OK) {
                memory.depositCooldown = target.lastCooldown
                if (!memory.depositType) memory.depositType = target.depositType
            }
            // 采集失败就提示
            else env.log.error(`depo 采集单位执行 harvest 返回错误码：${harvestResult}`)
        },
        runTarget: (creep, memory, workRoom) => {
            const { sourceFlagName, travelTime, depositType } = memory

            if (!workRoom || !workRoom.terminal) {
                env.log.warning(`[${creep.name}] 找不到存放建筑`)
                return false
            }

            // 转移并检测返回值
            creep.goTo(workRoom.terminal.pos, { range: 1 })
            const result = creep.transfer(workRoom.terminal, depositType)

            if (result === OK || result === ERR_NOT_ENOUGH_RESOURCES) {
                // 获取旗帜，旗帜没了就自杀
                const targetFlag = env.getFlagByName(sourceFlagName)
                if (!targetFlag) {
                    creep.suicide()
                    return false
                }

                // 如果来不及再跑一趟的话就自杀
                // 这里的跑一趟包含来回，所以时间会更长
                if (creep.ticksToLive <= (travelTime * 3) + 20) {
                    creep.suicide()
                    return false
                }

                // 时间充足就回去继续采集
                return true
            }
            else if (result === ERR_INVALID_ARGS) return true
            else if (result !== ERR_NOT_IN_RANGE) {
                env.log.error(`depo 采集单位执行 transfer 返回错误码：${result}`)
            }
        },
        onCreepStageChange
    })

    /**
     * 发布新的 deposit 采集单位
     *
     * @param room 要孵化的房间
     * @param depoFlagName 要采集的旗帜
     * @param otherData 额外存储的数据
     */
    const releaseDepositHarvester = function (
        room: Room,
        depoFlagName: string,
        otherData: Partial<DepositHarvesterMemory> = {}
    ) {
        const creepName = getDepositHarvesterName(depoFlagName)
        const bodys = getDepositHarvesterBody(room.energyAvailable)

        addSpawnTask(room, creepName, depositHarvesterRole, bodys)
        depositHarvester.registerUnit(creepName, { ...otherData, sourceFlagName: depoFlagName }, room)
    }

    addSpawnCallback(depositHarvesterRole, depositHarvester.addUnit)

    return releaseDepositHarvester
}
