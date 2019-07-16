// 爬虫数量控制
const creepNumberConfig = [
    {
        custom: false,
        role: 'worker',
        bodys: [WORK, WORK, CARRY, MOVE],
        number: 2
    }, {
        custom: false,
        role: 'upgrader',
        bodys: [WORK, WORK, CARRY, MOVE],
        number: 3
    }, {
        custom: true,
        role: 'transfer',
        bodys: [WORK, CARRY, MOVE],
        units: {
            transfer0: {
                role: 'transfer',
                state: '',
                sourceIndex: 1
            }
        }
    }, {
        custom: false,
        role: 'builder',
        bodys: [WORK, CARRY, MOVE],
        number: 2
    }
]

// 新爬虫的默认记忆
const creepDefaultMemory = {
    memory: {
        role: 'worker',
        state: '',
        sourceIndex: 1
    }
}

module.exports = {
    creepDefaultMemory,
    creepNumberConfig
}