/**
 * creep 数量控制
 * 
 * @param custom 是否启用自定义
 * @param role 角色
 * @param bodys 身体的组成部分
 * @param number 该 creep 的数量
 * @param units 启用自定义后的 creep 详细信息
 */
const creepsConfig = [
    {
        custom: false,
        role: 'worker',
        bodys: [WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE],
        number: 2
    }, {
        custom: false,
        role: 'upgrader',
        bodys: [WORK, CARRY, MOVE, WORK, CARRY, MOVE, CARRY, MOVE],
        number: 3
    }, {
        custom: true,
        role: 'transfer',
        bodys: [WORK, CARRY, MOVE, WORK, CARRY, MOVE],
        units: {
            transfer0: {
                role: 'transfer',
                state: ''
            }
        }
    }, {
        custom: false,
        role: 'builder',
        bodys: [WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, MOVE],
        number: 3
    }, {
        custom: false,
        role: 'repairer',
        bodys: [WORK, CARRY, MOVE, WORK, CARRY, MOVE],
        number: 1
    }
]

// 新 creep 的默认记忆
const creepDefaultMemory = {
    memory: {
        role: 'worker',
        working: false,
        targetSourceId: ''
    }
}

const myInfo = {
    name: 'HoPGoldy'
}

module.exports = {
    creepDefaultMemory,
    creepsConfig,
    myInfo
}