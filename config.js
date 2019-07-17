// 爬虫数量控制
const creepsConfig = [
    {
        custom: false,
        role: 'worker',
        workingMsg: '',
        bodys: [WORK, WORK, CARRY, MOVE],
        number: 2
    }, {
        custom: false,
        role: 'upgrader',
        workingMsg: '',
        bodys: [WORK, WORK, CARRY, MOVE],
        number: 1
    }, {
        custom: true,
        role: 'transfer',
        workingMsg: '',
        bodys: [WORK, CARRY, MOVE],
        units: {
            transfer0: {
                role: 'transfer',
                state: ''
            }
        }
    }, {
        custom: false,
        role: 'builder',
        workingMsg: '',
        bodys: [WORK, CARRY, MOVE],
        number: 4
    }
]

// 新爬虫的默认记忆
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