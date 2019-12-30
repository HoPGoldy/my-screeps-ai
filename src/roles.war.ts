import { BOOST_TYPE, BOOST_STATE } from './setting'
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
     */
    soldier: (spawnName: string): ICreepConfig => ({
        target: creep => creep.attackFlag(),
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
     * 7 级以上可用
     * 详情见 role.doctor, 并且请配合 boostRangeSoldier 使用
     * 
     * @param spawnName 出生点名称
     * @param creepsName 要治疗的 creep 名称数组
     */
    boostDoctor: (spawnName: string, creepsName: string[]): ICreepConfig => ({
        ...boostPrepare(BOOST_TYPE.HEAL),
        target: creep => creep.healTo(creepsName.map(name => Game.creeps[name])),
        spawn: spawnName,
        bodys: calcBodyPart({ HEAL: 25, MOVE: 25 })
    }),

    /**
     * 强化 - 范围型攻击士兵
     * 7 级以上可用
     * 会一直向旗帜发起进攻, 可以切换状态, 请配合 boostDoctor 使用
     */
    boostRangeSoldier: (spawnName: string): ICreepConfig => ({
        ...boostPrepare(BOOST_TYPE.PURE_RANGE_ATTACK),
        target: creep => creep.rangedAttackFlag(),
        spawn: spawnName,
        bodys: calcBodyPart({ TOUGH: 12, RANGE_ATTACK: 28, MOVE: 10 })
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
     */
    dismantler: (spawnName: string): ICreepConfig => ({
        target: creep => creep.dismantleFlag(),
        spawn: spawnName,
        bodyType: 'dismantler'
    }),

    /**
     * 强化 - 重型作战单位
     * 本角色仅能在 RCL >= 7 时生成
     * 
     * @param spawnName 出生点名称
     * @param bearTowerNum 可以承受多少 tower 的最大伤害，该数值越少，攻击能量越强，默认为 6 (1~6)
     */
    apocalypse: (spawnName: string, bearTowerNum: number = 6): ICreepConfig => {
        // 越界就置为 6
        if (bearTowerNum < 0 || bearTowerNum > 6) bearTowerNum = 6
        // 扛塔等级和bodyPart的对应关系
        const bodyMap = {
            1: { TOUGH: 2, RANGE_ATTACK: 15, MOVE: 10, HEAL: 23 },
            2: { TOUGH: 4, RANGE_ATTACK: 13, MOVE: 10, HEAL: 23 },
            3: { TOUGH: 6, RANGE_ATTACK: 11, MOVE: 10, HEAL: 23 },
            4: { TOUGH: 8, RANGE_ATTACK: 9, MOVE: 10, HEAL: 23 },
            5: { TOUGH: 10, RANGE_ATTACK: 7, MOVE: 10, HEAL: 23 },
            6: { TOUGH: 12, RANGE_ATTACK: 5, MOVE: 10, HEAL: 23 }
        }
        // 组装 CreepConfig
        return {
            ...boostPrepare(BOOST_TYPE.RANGE_ATTACK),
            target: creep => creep.rangedAttackFlag(),
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
            console.log("TCL: startResult", startResult)
            // 启动成功就移除之前的排队标志位
            if (startResult == OK) delete room.memory.hasMoreBoost
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
        
        console.log(`[${room.name}] 准备完成，开始生成`)
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