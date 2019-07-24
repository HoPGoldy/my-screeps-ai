const attackPath = require('moveSetting').getPath('attack')

const run = (creep) => {
    const enemy = checkEnemy(creep)
    if (enemy) {
        attack(creep, enemy)
    }
    else {
        standBy(creep)
    }
}

/**
 * 检查是否有敌人
 * 
 * @param {object} creep 
 * @returns {object|null} 返回最近的敌人或null
 */
const checkEnemy = (creep) => {
    // 从雷达扫描结果中获取敌人
    const enemys = Memory[creep.room.name].radarResult.enemys
    // 如果有敌人就返回最近的那个
    return enemys ? creep.pos.findClosestByRange(enemys) : null
}

/**
 * 待命
 * 移动到 [房间名 StandBy] 旗帜的位置
 * 
 * @param {object} creep 
 */
const standBy = (creep) => {
    const standByFlag = Game.flags[`${creep.room.name} StandBy`]
    creep.moveTo(standByFlag)
}

/**
 * 向敌方单位发起进攻
 * 
 * @param {object} creep 
 * @param {object} enemy 敌人 creep
 */
const attack = (creep, enemy) => {
    if (creep.attack(enemy) == ERR_NOT_IN_RANGE) {
        creep.moveTo(enemy.pos, attackPath)
    }
}

module.exports = {
    run
}