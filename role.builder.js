const defaultPath = require('moveSetting').defaultPath
const upgrader = require('role.upgrader')
const { harvestEngry, updateState } = require('utils')

const run = (creep) => {
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
        harvestEngry(creep)
    }
}

// 寻找存在的工地并建造
const build = (creep, target) => {
    if(creep.build(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, defaultPath)
    }
}

module.exports = {
    run
}