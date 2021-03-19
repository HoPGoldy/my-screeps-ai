import { DEPOSIT_MAX_COOLDOWN } from '@/setting'
import { bodyConfigs } from '../bodyConfigs'
import { createBodyGetter } from '@/utils'

/**
 * deposit 采集者
 * 从指定矿中挖 deposit > 将挖出来的资源转移到建筑中
 * 
 * @property {} sourceFlagName 旗帜名，要插在 deposit 上
 */
const depositHarvester: CreepConfig<'depositHarvester'> = {
    isNeed: (room, preMemory) => {
        // 旗帜效验, 没有旗帜则不生成
        const targetFlag = Game.flags[preMemory.data.sourceFlagName]
        if (!targetFlag) return false

        // 冷却时长过长则放弃该 deposit
        if (targetFlag.memory.depositCooldown >= DEPOSIT_MAX_COOLDOWN) {
            targetFlag.remove()
            return false
        }
        return true
    },
    source: creep => {
        const { sourceFlagName } = creep.memory.data
        // 旗帜效验, 没有旗帜则原地待命
        const targetFlag = Game.flags[sourceFlagName]
        if (!targetFlag) {
            creep.log(`找不到名称为 ${sourceFlagName} 的旗帜，creep 已移除`)
            creep.suicide()
            return false
        }

        // 如果采集满了 / 冷却时间太长 / 自己快死了，就往家跑
        if (
            (creep.store.getFreeCapacity(creep.memory.depositType) <= 0) ||
            (targetFlag.memory.depositCooldown >= 100 && !creep.memory.working) ||
            (creep.ticksToLive <= (targetFlag.memory.travelTime * 2) + 20)
        ) return true

        // 还没到就继续走
        if (!targetFlag.pos.isNearTo(creep.pos)) {
            // 边走边记录抵达时间
            if (targetFlag.memory.travelTime == undefined) targetFlag.memory.travelTime = 0 // 初始化
            // 旅途时间还没有计算完成
            else if (!targetFlag.memory.travelComplete) targetFlag.memory.travelTime ++ // 增量

            creep.goTo(targetFlag.pos, { range: 1 })

            return false
        }
        // 完成旅途时间计算
        else targetFlag.memory.travelComplete = true

        // 获取目标
        let target: Deposit
        if (targetFlag.memory.sourceId) target = Game.getObjectById(targetFlag.memory.sourceId as Id<Deposit>)
        else {
            target = targetFlag.pos.lookFor(LOOK_DEPOSITS)[0]
            
            // 找到了就赋值并缓存
            if (target) targetFlag.memory.sourceId = target.id
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
        if (harvestResult == OK) {
            targetFlag.memory.depositCooldown = target.lastCooldown
            if (!creep.memory.depositType) creep.memory.depositType = target.depositType
        }
        // 采集失败就提示
        else creep.say(`采集 ${harvestResult}`)
    },
    target: creep => {
        const { spawnRoom, data: { sourceFlagName } } = creep.memory

        const room = Game.rooms[spawnRoom]
        if (!room || !room.terminal) {
            creep.log(`[${creep.name}] 找不到存放建筑`, 'yellow')
            return false
        }

        // 转移并检测返回值
        const result = creep.transferTo(room.terminal, creep.memory.depositType, { range: 1 })
        if (result === OK || result === ERR_NOT_ENOUGH_RESOURCES) {
            // 获取旗帜，旗帜没了就自杀
            const targetFlag = Game.flags[sourceFlagName]
            if (!targetFlag) {
                creep.suicide()
                return false
            }

            // 如果来不及再跑一趟的话就自杀
            // 这里的跑一趟包含来回，所以时间会更长
            if (creep.ticksToLive <= (targetFlag.memory.travelTime * 3) + 20) {
                creep.suicide()
                return false
            }

            // 时间充足就回去继续采集
            return true
        }
        else if (result === ERR_INVALID_ARGS) return true
        else creep.say(`转移 ${result}`)
    },
    bodys: createBodyGetter(bodyConfigs.remoteHarvester)
}

export default depositHarvester