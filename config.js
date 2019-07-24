/**
 * creep 数量控制
 * 下面所有以房间名称命名的对象都是其房间的数量配置项
 * 
 * @param role 角色
 * @param bodys 身体的组成部分
 * @param number 该 creep 的数量
 */
const W47S6 = [
    {
        role: 'worker',
        bodys: [WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE],
        number: 2
    }, {
        role: 'upgrader',
        bodys: [WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE],
        number: 2
    }, {
        role: 'transfer',
        bodys: [WORK, CARRY, MOVE, WORK, CARRY, MOVE],
        number: 1
    }, {
        role: 'builder',
        bodys: [WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE],
        number: 2
    }, {
        role: 'repairer',
        bodys: [WORK, CARRY, MOVE, WORK, CARRY, MOVE],
        number: 1
    }, {
        role: 'defender',
        bodys: [TOUGH, TOUGH, TOUGH, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE],
        number: 4
    }
]

// 新 creep 的默认记忆
const creepDefaultMemory = {
    memory: {
        role: 'worker',
        working: false
    }
}

const myInfo = {
    name: 'HoPGoldy'
}

module.exports = {
    creepDefaultMemory,
    creepsNumberConfig: { W47S6 },
    myInfo
}