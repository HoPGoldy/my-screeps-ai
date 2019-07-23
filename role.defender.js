const attackPath = require('moveSetting').getPath('attack')
const { myInfo } = require('config')

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
 * @param {object} creep 
 */
const checkEnemy = (creep) => {
    const enemy = creep.pos.findClosestByRange(FIND_CREEPS, {
        filter: creep => creep.owner.username != myInfo.name
    })

    if (enemy) return enemy
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