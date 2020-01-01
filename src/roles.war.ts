import { BOOST_TYPE, BOOST_STATE, DEFAULT_FLAG_NAME } from './setting'
import { calcBodyPart } from './utils'

/**
 * 战斗角色组
 * 本角色组包括了对外战斗和房间防御所需要的角色
 */
export default {
    /**
     * 士兵
     * 会一直向旗帜发起进攻,
     * 优先攻击旗帜 3*3 范围内的 creep, 没有的话会攻击旗帜所在位置的建筑
     * 
     * @param spawnName 出生点名称
     * @param flagName 要攻击的旗帜名称
     */
    soldier: (spawnName: string, flagName: string = DEFAULT_FLAG_NAME.ATTACK): ICreepConfig => ({
        ...battleBase(flagName),
        target: creep => creep.attackFlag(flagName),
        spawn: spawnName,
        bodyType: 'attacker'
    }),

    /**
     * 医生
     * 一直治疗给定的 creep
     * 
     * @param spawnName 出生点名称
     * @param creepsName 要治疗的 creep 名称数组
     */
    doctor: (spawnName: string, creepsName: string[]): ICreepConfig => ({
        target: creep => creep.healTo(creepsName.map(name => Game.creeps[name])),
        spawn: spawnName,
        bodyType: 'healer'
    }),

    /**
     * 强化 - HEAL
     * 7 级以上可用, 25HEAL 25MOVE
     * 详情见 role.doctor
     * 
     * @param spawnName 出生点名称
     * @param creepsName 要治疗的 creep 名称数组
     */
    boostDoctor: (spawnName: string, creepsName: string[]): ICreepConfig => ({
        ...boostPrepare(BOOST_TYPE.HEAL),
        target: creep => creep.healTo(creepsName.map(name => Game.creeps[name])),
        spawn: spawnName,
        bodys: calcBodyPart({ [HEAL]: 25, [MOVE]: 25 })
    }),

    /**
     * 房间防御者
     * 到 "房间名 StandBy" 旗帜下待命 > 攻击出现的敌人
     * 
     * @param spawnName 出生点名称
     */
    defender: (spawnName: string): ICreepConfig => ({
        source: creep => creep.standBy(),
        target: creep => creep.defense(),
        switch: creep => creep.checkEnemy(),
        spawn: spawnName,
        bodyType: 'attacker'
    }),

    /**
     * 拆除者
     * 会一直向旗帜发起进攻，拆除旗帜下的建筑
     * 
     * @param spawnName 出生点名称
     * @param flagName 要攻击的旗帜名称
     */
    dismantler: (spawnName: string, flagName: string = DEFAULT_FLAG_NAME.ATTACK): ICreepConfig => ({
        ...battleBase(flagName),
        target: creep => creep.dismantleFlag(flagName),
        spawn: spawnName,
        bodyType: 'dismantler'
    }),

    /**
     * 强化 - 拆除者
     * 7 级以上可用, 12TOUGH 28WORK 10MOVE
     * 详情见 role.dismantler，请配合 boostDoctor 使用
     * 
     * @param spawnName 出生点名称
     * @param flagName 要攻击的旗帜名称
     */
    boostDismantler: (spawnName: string, flagName: string = DEFAULT_FLAG_NAME.ATTACK): ICreepConfig => ({
        ...battleBase(flagName),
        ...boostPrepare(BOOST_TYPE.DISMANTLE),
        target: creep => creep.dismantleFlag(flagName),
        spawn: spawnName,
        bodys: calcBodyPart({ [TOUGH]: 12, [WORK]: 28, [MOVE]: 10 })
    }),

    /**
     * 强化 - 重型作战单位
     * 本角色仅能在 RCL >= 7 时生成
     * 
     * @param spawnName 出生点名称
     * @param bearTowerNum 可以承受多少 tower 的最大伤害，该数值越少，攻击能量越强，默认为 6 (1~6)
     * @param flagName 要攻击的旗帜名称
     */
    apocalypse: (spawnName: string, bearTowerNum: number = 6, flagName: string = DEFAULT_FLAG_NAME.ATTACK): ICreepConfig => {
        // 越界就置为 6
        if (bearTowerNum < 0 || bearTowerNum > 6) bearTowerNum = 6
        // 扛塔等级和bodyPart的对应关系
        const bodyMap = {
            1: { [TOUGH]: 2, [RANGED_ATTACK]: 15, [MOVE]: 6, [HEAL]: 5 },
            2: { [TOUGH]: 4, [RANGED_ATTACK]: 20, [MOVE]: 9, [HEAL]: 9 },
            3: { [TOUGH]: 6, [RANGED_ATTACK]: 21, [MOVE]: 10, [HEAL]: 13 },
            4: { [TOUGH]: 8, [RANGED_ATTACK]: 15, [MOVE]: 10, [HEAL]: 17 },
            5: { [TOUGH]: 10, [RANGED_ATTACK]: 9, [MOVE]: 10, [HEAL]: 21 },
            6: { [TOUGH]: 12, [RANGED_ATTACK]: 5, [MOVE]: 10, [HEAL]: 23 }
        }
        // 组装 CreepConfig
        return {
            ...battleBase(flagName),
            ...boostPrepare(BOOST_TYPE.RANGED_ATTACK),
            target: creep => creep.rangedAttackFlag(flagName),
            spawn: spawnName,
            bodys: calcBodyPart(bodyMap[bearTowerNum])
        }
    },
}

/**
 * Boost Creep 准备阶段
 * 本方法抽象出了 boost Creep 通用的 isNeed 阶段和 prepare 阶段
 * 
 * @param boostType BOOST.TYPE 类型之一
 */
const boostPrepare = (boostType: string) => ({
    /**
     * 自主调起强化进程并等待 lab 准备就绪
     */
    isNeed: (room: Room) => {
        // 获取强化旗帜
        const boostFlagName = room.name + 'Boost'
        const boostFlag = Game.flags[boostFlagName]
        if (!boostFlag) {
            console.log(`[${room.name}] 未找到 ${boostFlagName} 旗帜，请新建`)
            return false
        }

        // 没有强化任务就新建任务
        if (!room.memory.boost) {
            // 启动强化任务
            const startResult = room.boost(boostType)
            // 启动成功就移除之前的排队标志位
            if (startResult == OK) {
                console.log(`[${room.name} boost] 已发布任务，等待强化材料准备就绪`)
                delete room.memory.hasMoreBoost
            }
            else console.log(`[${room.name}] 暂时无法生成，Room.boost 返回值:${startResult}`)

            return false
        }

        // 有任务但是不是强化自己的就跳过
        if (room.memory.boost.type != boostType) {
            console.log(`[${room.name}] 等待其他强化完成`)
            room.memory.hasMoreBoost = true
            return false
        }

        // 是自己的强化任务但是还没准备好就跳过
        if (room.memory.boost.state != BOOST_STATE.WAIT_BOOST) return false
        
        console.log(`[${room.name} boost] 准备就绪，开始生成`)
        return true
    },
    /**
     * 移动至强化位置并执行强化
     * @danger 该位置是 Room.memory.boost.pos 中定义的，并不是旗帜的实时位置，该逻辑有可能会导致迷惑
     */
    prepare: (creep: Creep) => {
        // 获取强化位置
        const boostTask = creep.room.memory.boost
        const boostPos = new RoomPosition(boostTask.pos[0], boostTask.pos[1], creep.room.name)

        // 抵达了强化位置就开始强化
        if (creep.pos.isEqualTo(boostPos)) {
            const boostResult = creep.room.boostCreep(creep)

            if (boostResult == OK) {
                creep.say('💥 强化完成')
                creep.room.memory.boost.state = BOOST_STATE.CLEAR
                return true
            }
            else {
                console.log(`[${creep.name}] 强化失败 ${boostResult}`)
                return false
            }
        }
        // 否则就继续移动
        else creep.moveTo(boostPos, { reusePath: 10 })
        return false
    }
})

/**
 * 战斗 creep 基础阶段
 * 本方法抽象出了战斗 Creep 通用的 source 阶段和 switch 阶段
 * 
 * @param flagName 目标旗帜名称
 */
const battleBase = (flagName: string) => ({
    /**
     * 获取旗帜，然后向指定房间移动
     * 同时保证自己的健康状态
     */
    source: (creep: Creep) => {
        const targetFlag = creep.getFlag(flagName)
        if (!targetFlag) return creep.say('旗呢?')

        // 远程移动
        creep.farMoveTo(targetFlag.pos)
        creep.say('🛴')

        // 保证自己血量健康（兼容没有 HEAL 的 creep）
        if ((creep.hits < creep.hitsMax) && creep.getActiveBodyparts(HEAL)) {
            creep.heal(creep)
            creep.say('💔')
        }
    },
    /**
     * 战斗单位的通用 switch 阶段
     * 如果在旗帜房间内则 target
     * 如果不在则 source
     * 
     * @param flagName 目标旗帜名称
     */
    switch: (creep: Creep) => {
        const targetFlag = creep.getFlag(flagName)

        // 没有旗帜就为战斗模式
        if (!targetFlag) {
            creep.say('旗呢?')
            return (creep.memory.working = true)
        }

        if (creep.room.name == targetFlag.pos.roomName && !creep.memory.working) {
            console.log(`[${creep.name}] 抵达指定房间，切入作战模式`)
            creep.memory.working = true
        }
        else if (creep.room.name != targetFlag.pos.roomName && creep.memory.working) {
            console.log(`[${creep.name}] 不在指定房间，切入迁徙模式`)
            creep.memory.working = false
        }

        return creep.memory.working
    },
})