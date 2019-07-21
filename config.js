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
        bodys: [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
        number: 2
    }, {
        custom: false,
        role: 'upgrader',
        bodys: [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
        number: 1
    }, {
        custom: true,
        role: 'transfer',
        bodys: [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
        units: {
            transfer0: {
                role: 'transfer',
                state: ''
            },
            transfer1: {
                role: 'transfer',
                state: ''
            }
        }
    }, {
        custom: false,
        role: 'builder',
        bodys: [WORK, WORK, WORK, CARRY, MOVE, MOVE],
        number: 2
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

module.exports = {
    creepDefaultMemory,
    creepsConfig
}