// 爬虫数量控制
const creepNumberConfig = [
    {
        custom: true,
        role: 'worker',
        bodys: [WORK, CARRY, MOVE],
        units: {
            worker0: {
                role: 'worker',
                state: '',
                sourceIndex: 1
            },
            worker1: {
                role: 'worker',
                state: '',
                sourceIndex: 1
            },
            worker2: {
                role: 'worker',
                state: '',
                sourceIndex: 0
            },
            worker3: {
                role: 'worker',
                state: '',
                sourceIndex: 0
            }
        }
    }, {
        custom: false,
        role: 'upgrader',
        bodys: [WORK, CARRY, MOVE],
        number: 1
    }, {
        custom: false,
        role: 'builder',
        bodys: [WORK, CARRY, MOVE],
        number: 2
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