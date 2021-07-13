import { Color } from "@/modulesGlobal/console"
import { MyCreep } from "../types/role"

/**
 * Boost Creep 准备阶段
 * 本方法抽象出了 boost Creep 通用的 isNeed 阶段和 prepare 阶段
 * 
 * @param boostType BOOST.TYPE 类型之一
 */
export const boostPrepare = () => ({
    /**
     * 移动至强化位置并执行强化
     * @danger 该位置是 Room.memory.boost.pos 中定义的，并不是旗帜的实时位置，该逻辑有可能会导致迷惑
     */
    prepare: (creep: Creep) => {
        // 获取强化位置
        const boostTask = creep.room.memory.boost
        if (boostTask.state !== 'waitBoost') {
            creep.say('boost 未准备就绪')
            return false
        }
        const boostPos = new RoomPosition(boostTask.pos[0], boostTask.pos[1], creep.room.name)

        // 抵达了强化位置就开始强化
        if (creep.pos.isEqualTo(boostPos)) {
            const boostResult = creep.room.boostCreep(creep)

            if (boostResult === OK) {
                creep.say('💥 强化完成')
                return true
            }
            else {
                creep.log(`强化失败 ${boostResult}`, Color.Red)
                return false
            }
        }
        // 否则就继续移动
        else creep.goTo(boostPos, { range: 0 })
        return false
    }
})

/**
 * 战斗 creep 基础阶段
 * 本方法抽象出了战斗 Creep 通用的 source 阶段和 switch 阶段
 * 
 * @param flagName 目标旗帜名称
 */
export const battleBase = <Role extends 'soldier' | 'dismantler' | 'boostDismantler' | 'apocalypse'>() => ({
    // 根据玩家配置决定是否持续生成
    isNeed: (room, preMemory: MyCreepMemory<Role>) => preMemory.data.keepSpawn,
    /**
     * 获取旗帜，然后向指定房间移动
     * 同时保证自己的健康状态
     */
    source: (creep: MyCreep<Role>) => {
        const { targetFlagName } = creep.memory.data

        const targetFlag = creep.getFlag(targetFlagName)
        if (!targetFlag) {
            creep.say('旗呢?')
            return false
        }

        // 远程移动
        creep.goTo(targetFlag.pos)
        creep.say('🛴', true)

        // 保证自己血量健康（兼容没有 HEAL 的 creep）
        if ((creep.hits < creep.hitsMax) && creep.getActiveBodyparts(HEAL)) {
            creep.heal(creep)
            creep.say('💔', true)
        }

        if (creep.room.name == targetFlag.pos.roomName) {
            creep.log(`抵达指定房间，切入作战模式`, Color.Green)
            return true
        }

        return false
    }
})
