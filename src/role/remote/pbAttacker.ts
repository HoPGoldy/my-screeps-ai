import { removeCreep } from '@/modulesGlobal/creep/utils'
import { PB_HARVESTE_STATE } from '@/setting'
import { calcBodyPart } from '@/utils'

/**
 * PowerBank 攻击单位
 * 移动并攻击 powerBank, 请在 8 级时生成
 * @see doc "../doc/PB 采集小组设计案"
 * 
 * @property {} sourceFlagName 旗帜名，要插在 powerBank 上
 */
const pbAttacker: CreepConfig<'pbAttacker'> = {
    prepare: creep => {
        const { spawnRoom, data: { sourceFlagName, healerCreepName } } = creep.memory

        const targetFlag = Game.flags[sourceFlagName]
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
            if (targetFlag.memory.sourceId) {
                const pb = Game.getObjectById(targetFlag.memory.sourceId as Id<StructurePowerBank>)
                if (!pb) findPowerbank = false
            }
            // 没缓存就查找 pb
            else {
                const powerbank = _.find(targetFlag.pos.lookFor(LOOK_STRUCTURES), s => s.structureType === STRUCTURE_POWER_BANK) as StructurePowerBank
                // 并写入缓存
                if (powerbank) targetFlag.memory.sourceId = powerbank.id
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
            creep.memory.stand = true
            // 检查下是否还没统计移动所需时间
            if (!targetFlag.memory.travelTime) targetFlag.memory.travelTime = CREEP_LIFE_TIME - creep.ticksToLive
            return true
        }

        return false
    },
    target: creep => {
        const { spawnRoom: spawnRoomName, data: { sourceFlagName, healerCreepName } } = creep.memory

        const targetFlag = Game.flags[sourceFlagName]
        if (!targetFlag) {
            removeSelfGroup(creep, healerCreepName, spawnRoomName)
            return false
        }

        // 获取 pb
        let powerbank: StructurePowerBank = undefined
        if (targetFlag.memory.sourceId) powerbank = Game.getObjectById(targetFlag.memory.sourceId as Id<StructurePowerBank>)
        else {
            // 没有缓存就进行查找
            powerbank = _.find(targetFlag.pos.lookFor(LOOK_STRUCTURES), s => s.structureType === STRUCTURE_POWER_BANK) as StructurePowerBank
            // 并写入缓存
            if (powerbank) targetFlag.memory.sourceId = powerbank.id
        }

        // 找不到 pb 了
        if (!powerbank) {
            // 发现废墟，pb 成功摧毁，进入下个阶段
            if (targetFlag.pos.lookFor(LOOK_RUINS).length > 0) {
                targetFlag.memory.state = PB_HARVESTE_STATE.TRANSFER
            }
            // 未能成功在 pb 消失前将其摧毁，任务失败，移除旗帜
            else targetFlag.remove()

            // 移除采集小组
            removeSelfGroup(creep, healerCreepName, spawnRoomName)
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
                (targetFlag.memory.state != PB_HARVESTE_STATE.PREPARE) && 
                (powerbank.hits <= (targetFlag.memory.travelTime + 150 + 50) * 600 * 2)
            ) {
                // 发布运输小组
                const spawnRoom = Game.rooms[spawnRoomName]
                if (!spawnRoom) {
                    creep.say('家呢？')
                    return false
                }

                // 下面这个 1600 是 [ CARRY: 32, MOVE: 16 ] 的 pbCarrier 的最大运输量
                spawnRoom.spawner.release.pbCarrierGroup(sourceFlagName, Math.ceil(powerbank.power / 1600))

                // 设置为新状态
                targetFlag.memory.state = PB_HARVESTE_STATE.PREPARE
            }
        }
        else if (attackResult === ERR_NOT_IN_RANGE) creep.moveTo(powerbank)
    },
    bodys: () => calcBodyPart({ [ATTACK]: 20, [MOVE]: 20 })
}

/**
 * pbAttacker 移除自身采集小组并自杀的封装
 * 
 * @param creep pbAttacker
 * @param healerName 治疗单位名称
 * @param spawnRoomName 出生房间名
 * @returns 是否移除成功
 */
const removeSelfGroup = function(creep: Creep, healerName: string, spawnRoomName: string): boolean {
    // 移除自己和 heal 的配置项
    const spawnRoom = Game.rooms[spawnRoomName]
    if (!spawnRoom) {
        creep.say('家呢？')
        return false
    }

    // 移除角色组
    removeCreep(creep.name, { immediate: true })
    removeCreep(healerName, { immediate: true })
}

export default pbAttacker