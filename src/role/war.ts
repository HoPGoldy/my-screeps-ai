import { calcBodyPart, createBodyGetter } from 'utils'
import { bodyConfigs } from 'setting'

/**
 * 战斗角色组
 * 本角色组包括了对外战斗和房间防御所需要的角色
 */
const roles: {
    [role in WarRoleConstant]: (data: CreepData) => ICreepConfig
} = {
    /**
     * 士兵
     * 会一直向旗帜发起进攻,
     * 优先攻击旗帜 3*3 范围内的 creep, 没有的话会攻击旗帜所在位置的建筑
     */
    soldier: (data: WarUnitData): ICreepConfig => ({
        ...battleBase(data.targetFlagName, data.keepSpawn),
        target: creep => {
            creep.attackFlag(data.targetFlagName)

            const targetFlag = creep.getFlag(data.targetFlagName)
            if (!targetFlag) {
                creep.say('旗呢?')
                return false
            }

            if (creep.room.name !== targetFlag.pos.roomName) {
                creep.log(`不在指定房间，切入迁徙模式`)
                return true
            }
            return false
        },
        bodys: createBodyGetter(bodyConfigs.attacker)
    }),

    /**
     * 医生
     * 一直治疗给定的 creep
     * 
     * @param spawnRoom 出生房间名称
     * @param creepsName 要治疗的 creep 名称
     * @param standByFlagName 待命旗帜名称，本角色会优先抵达该旗帜, 直到目标 creep 出现
     */
    doctor: (data: HealUnitData): ICreepConfig => ({
        isNeed: () => data.keepSpawn,
        prepare: creep => {
            // 治疗单位不允许发起对穿
            creep.memory.disableCross = true
            return true
        },
        target: creep => {
            const target = Game.creeps[data.creepName]
            if (!target) {
                creep.say('💤')
                return false
            }
            creep.healTo(target)
            return false
        },
        bodys: createBodyGetter(bodyConfigs.healer)
    }),

    /**
     * 强化 - HEAL
     * 7 级以上可用, 25HEAL 25MOVE
     * 详情见 role.doctor
     * 
     * @param spawnRoom 出生房间名称
     * @param creepsName 要治疗的 creep 名称
     */
    boostDoctor: (data: HealUnitData): ICreepConfig => ({
        isNeed: () => data.keepSpawn,
        prepare: creep => {
            // 治疗单位不允许发起对穿
            if (!creep.memory.disableCross) creep.memory.disableCross = true

            return boostPrepare().prepare(creep)
        },
        target: creep => {
            const target = Game.creeps[data.creepName]
            if (!target) {
                creep.say('💤')
                return false
            }
            creep.healTo(target)
            return false
        },
        bodys: () => calcBodyPart({ [TOUGH]: 12, [HEAL]: 25, [MOVE]: 10 })
    }),

    /**
     * 拆除者
     * 会一直向旗帜发起进攻，拆除旗帜下的建筑
     * 
     * @param spawnRoom 出生房间名称
     * @param flagName 要攻击的旗帜名称
     * @param standByFlagName 待命旗帜名称，本角色会优先抵达该旗帜, 直到该旗帜被移除
     */
    dismantler: (data: WarUnitData): ICreepConfig => ({
        ...battleBase(data.targetFlagName, data.keepSpawn),
        target: creep => creep.dismantleFlag(data.targetFlagName, data.healerName),
        bodys: createBodyGetter(bodyConfigs.dismantler)
    }),

    /**
     * 强化 - 拆除者
     * 7 级以上可用, 12TOUGH 28WORK 10MOVE
     * 详情见 role.dismantler，请配合 boostDoctor 使用
     * 
     * @param spawnRoom 出生房间名称
     * @param flagName 要攻击的旗帜名称
     * @param standByFlagName 待命旗帜名称，本角色会优先抵达该旗帜, 直到该旗帜被移除
     */
    boostDismantler: (data: WarUnitData): ICreepConfig => ({
        ...battleBase(data.targetFlagName, data.keepSpawn),
        ...boostPrepare(),
        target: creep => creep.dismantleFlag(data.targetFlagName, data.healerName),
        bodys: () => calcBodyPart({ [TOUGH]: 12, [WORK]: 28, [MOVE]: 10 })
    }),

    /**
     * 强化 - 重型作战单位
     * 本角色仅能在 RCL >= 7 时生成
     * 扛塔数量为 0 时依旧会携带 3 个强化 HEAL (144/T 的回复)，但是不会有 TOUGH
     * 
     * @param spawnRoom 出生房间名称
     * @param bearTowerNum 可以承受多少 tower 的最大伤害，该数值越少，攻击能力越强，默认为 6 (0~6)
     * @param flagName 要攻击的旗帜名称
     */
    apocalypse: (data: ApocalypseData): ICreepConfig => {
        // 越界就置为 6
        if (data.bearTowerNum < 0 || data.bearTowerNum > 6) data.bearTowerNum = 6
        // 扛塔等级和bodyPart的对应关系
        const bodyMap = {
            0: { [TOUGH]: 0, [RANGED_ATTACK]: 15, [MOVE]: 6, [HEAL]: 3 },
            1: { [TOUGH]: 2, [RANGED_ATTACK]: 15, [MOVE]: 6, [HEAL]: 5 },
            2: { [TOUGH]: 4, [RANGED_ATTACK]: 20, [MOVE]: 9, [HEAL]: 9 },
            3: { [TOUGH]: 6, [RANGED_ATTACK]: 21, [MOVE]: 10, [HEAL]: 13 },
            4: { [TOUGH]: 8, [RANGED_ATTACK]: 15, [MOVE]: 10, [HEAL]: 17 },
            5: { [TOUGH]: 10, [RANGED_ATTACK]: 9, [MOVE]: 10, [HEAL]: 21 },
            6: { [TOUGH]: 12, [RANGED_ATTACK]: 5, [MOVE]: 10, [HEAL]: 23 }
        }
        const bodyConfig: BodySet = bodyMap[data.bearTowerNum]

        // 组装 CreepConfig
        return {
            ...battleBase(data.targetFlagName, data.keepSpawn),
            ...boostPrepare(),
            target: creep => {
                // 获取旗帜
                const targetFlag = creep.getFlag(data.targetFlagName)
                if (!targetFlag) {
                    creep.say('旗呢?')
                    return false
                }

                // 治疗自己，不会检查自己生命值，一直治疗
                // 因为本 tick 受到的伤害只有在下个 tick 才能发现，两个 tick 累计的伤害足以击穿 tough。
                if (creep.getActiveBodyparts(HEAL)) creep.heal(creep)

                // 无脑移动
                creep.moveTo(targetFlag)

                if (creep.room.name == targetFlag.pos.roomName) {
                    // 根据 massMode 选择不同给攻击模式
                    if (creep.memory.massMode) creep.rangedMassAttack()
                    else {
                        const structures = targetFlag.pos.lookFor(LOOK_STRUCTURES)
                        if (structures.length > 0) creep.rangedAttack(structures[0])
                    }
                }
                else {
                    creep.log(`不在指定房间，切入迁徙模式`)
                    return true
                }
            },
            bodys: () => calcBodyPart(bodyConfig)
        }
    },

    /**
     * 防御单位
     * 会自动攻击房间内的敌对单位
     * 注意身体部件不会自动适配，也就是说低等级房间无法造出来这个单位。原因在于低等级房间就算能造出来小 creep 也等于送人头。
     */
    defender: (): ICreepConfig => ({
        // 委托 controller 判断房间内是否有威胁
        isNeed: room => {
            const needSpawn = room.controller.checkEnemyThreat()

            // 如果威胁已经解除了，就解除主动防御相关工作
            if (!needSpawn) {
                room.memory.boost && (room.memory.boost.state = 'boostClear')
                delete room.memory.war
                delete room.memory.defenseMode

                Game.notify(`[${room.name}][${Game.time}] 入侵威胁解除，已取消主动防御模式`)
            }
            return needSpawn
        },
        ...boostPrepare(),
        target: creep => {
            let enemys: (Creep | PowerCreep)[] = creep.room._enemys
            // 没有缓存则新建缓存
            if (!enemys) enemys = creep.room._enemys = creep.room.find(FIND_HOSTILE_CREEPS)
            if (enemys.length <= 0) enemys = creep.room._enemys = creep.room.find(FIND_HOSTILE_POWER_CREEPS)
            // 没有敌人就啥也不干
            if (enemys.length <= 0) return false

            // 从缓存中获取敌人
            const enemy = creep.pos.findClosestByRange(creep.room._enemys)
            creep.say(`💢`)
            // 防止一不小心出房间了
            if ((enemy.pos.x !== 0 && enemy.pos.x !== 49 && enemy.pos.y !== 0 && enemy.pos.y !== 49) && !creep.pos.isNearTo(enemy.pos)) creep.moveTo(enemy.pos)

            creep.attack(enemy)
        },
        // 34 个 t3 强化的 ATTACK 可以造成 4.08K/T 的伤害，刚好可以打穿 12 个 T3 TOUGH
        bodys: () => calcBodyPart({ [TOUGH]: 6, [ATTACK]: 34, [MOVE]: 10 })
    })
}

/**
 * Boost Creep 准备阶段
 * 本方法抽象出了 boost Creep 通用的 isNeed 阶段和 prepare 阶段
 * 
 * @param boostType BOOST.TYPE 类型之一
 */
const boostPrepare = () => ({
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
                creep.log(`强化失败 ${boostResult}`, 'red')
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
const battleBase = (flagName: string, keepSpawn: boolean) => ({
    // 根据玩家配置决定是否持续生成
    isNeed: () => keepSpawn,
    /**
     * 获取旗帜，然后向指定房间移动
     * 同时保证自己的健康状态
     */
    source: (creep: Creep) => {
        const targetFlag = creep.getFlag(flagName)
        if (!targetFlag) {
            creep.say('旗呢?')
            return false
        }

        // 远程移动
        creep.goTo(targetFlag.pos, { checkTarget: true })
        creep.say('🛴', true)

        // 保证自己血量健康（兼容没有 HEAL 的 creep）
        if ((creep.hits < creep.hitsMax) && creep.getActiveBodyparts(HEAL)) {
            creep.heal(creep)
            creep.say('💔', true)
        }

        if (creep.room.name == targetFlag.pos.roomName) {
            creep.log(`抵达指定房间，切入作战模式`, 'green')
            return true
        }

        return false
    }
})

export default roles