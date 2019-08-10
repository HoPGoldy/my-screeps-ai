const attackPath = require('moveSetting').getPath('attack')
const { getStructureByFlag } = require('utils')

// 进攻旗帜的名称
const ATTACK_FLAG_NAME = 'a'

const run = (creep) => {
    attack(creep)
    heal(creep)
}

/**
 * 治疗自身
 * @param {object} creep 士兵
 */
function heal(creep) {
    if (creep.hits < creep.hitsMax) {
        creep.heal(creep)
    }
}

/**
 * 进攻
 * 向 ATTACK_FLAG_NAME + memory.squad 旗帜发起冲锋
 * 如果有 ATTACK_FLAG_NAME 旗帜，则优先进行响应
 *
 * @todo 进攻敌方 creep
 * @param {object} creep 士兵
 */
function attack(creep) {
    // 优先相应 Attack 旗帜
    let attackFlag = Game.flags[ATTACK_FLAG_NAME]
    if (!attackFlag) attackFlag = Game.flags[ATTACK_FLAG_NAME + creep.memory.squad]

    if (!attackFlag) {
        console.log(`没有名为 ${ATTACK_FLAG_NAME + creep.memory.squad} 的旗子`)
        return false
    }

    creep.moveTo(attackFlag.pos, attackPath)
    if (attackFlag.room) {
        const target = getStructureByFlag(attackFlag, STRUCTURE_CONTROLLER)
        const attackResult = creep.attack(target)
        console.log("TCL: attack -> attackResult", creep.name, attackResult)

        // console.log(claimResult == 0 ? '正在占领' : `${creep.name} 占领失败，错误码 ${claimResult}`)
    }
}

module.exports = {
    run
}