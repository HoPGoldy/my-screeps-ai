const buildPath = require('moveSetting').getPath('build')
const upgrader = require('role.upgrader')
const { updateState, getEngry } = require('utils')

const run = (creep) => {
    // if (creep.room.name != 'W48S6') {
    //     creep.moveTo(new RoomPosition(24, 21, 'W48S6'))
    //     return
    // }
    const working = updateState(creep, '🚧 建造')

    if (working) {
        // 搜索建筑工地
        const targets = creep.room.find(FIND_CONSTRUCTION_SITES)
        // 找到就去建造
        if (targets.length > 0) {
            build(creep, targets[0])
        }
        // 找不到就变身 upgrader
        else {
            upgrader.run(creep)
        }
    }
    else {
        getEngry(creep)
    }
}

// 寻找存在的工地并建造
const build = (creep, target) => {
    if(creep.build(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, buildPath)
    }
}

module.exports = {
    run
}