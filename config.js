// 爬虫数量控制
const creepNumberMap = {
    worker: 4,
    upgrader: 2,
    builder: 0,
    transfer: 1
}

const creepNumberConfig = [
    {
        custom: true,
        role: 'worker',
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
        number: 2
    }, {
        custom: false,
        role: 'builder',
        number: 1
    }, {
        custom: true,
        role: 'transfer',
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
    creepNumberMap,
    creepDefaultMemory,
    creepNumberConfig
}