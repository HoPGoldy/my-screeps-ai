import { calcBodyPart } from '../bodyUtils'
import { CreepConfig, CreepRole } from '../types/role'

/**
 * 防御单位
 * 会自动攻击房间内的敌对单位
 * 注意身体部件不会自动适配，也就是说低等级房间无法造出来这个单位。原因在于低等级房间就算能造出来小 creep 也等于送人头。
 */
const defender: CreepConfig<CreepRole.Defender> = {
    // 委托 controller 判断房间内是否有威胁
    isNeed: (room, preMemory) => {
        const needSpawn = room.controller.checkEnemyThreat()
        const { boostTaskId } = preMemory.data

        // 如果威胁已经解除了，就不再孵化
        if (!needSpawn && boostTaskId) {
            room.myLab.finishBoost(boostTaskId)
            Game.notify(`[${room.name}][${Game.time}] 入侵威胁解除，已取消主动防御模式`)
        }
        // 还要打，续上
        else room.myLab.reloadBoostTask(boostTaskId)

        return needSpawn
    },
    prepare: creep => {
        const { boostTaskId } = creep.memory.data
        if (!boostTaskId) return true

        return creep.room.myLab.boostCreep(creep, boostTaskId)
    },
    target: creep => {
        let enemys: (Creep | PowerCreep)[] = creep.room._enemys
        // 没有缓存则新建缓存
        if (!enemys) enemys = creep.room._enemys = creep.room.find(FIND_HOSTILE_CREEPS)
        if (enemys.length <= 0) enemys = creep.room._enemys = creep.room.find(FIND_HOSTILE_POWER_CREEPS)
        // 没有敌人就啥也不干
        if (enemys.length <= 0) return false

        // 从缓存中获取敌人
        const enemy = creep.pos.findClosestByRange(creep.room._enemys)
        creep.say('💢')
        // 防止一不小心出房间了
        if ((enemy.pos.x !== 0 && enemy.pos.x !== 49 && enemy.pos.y !== 0 && enemy.pos.y !== 49) && !creep.pos.isNearTo(enemy.pos)) creep.moveTo(enemy.pos)

        creep.attack(enemy)
    },
    // 34 个 t3 强化的 ATTACK 可以造成 4.08K/T 的伤害，刚好可以打穿 12 个 T3 TOUGH
    bodys: () => calcBodyPart([[TOUGH, 6], [ATTACK, 34], [MOVE, 10]])
}

export default defender
