const buildPath = require('moveSetting').getPath('build')
const support_roles = {
    'harvester': require('role.harvester'),
    'upgrader': require('role.upgrader')
}
const { updateState, getEngry } = require('utils')

// 在没有任务时支援的角色
// harvester upgrader
SUPPORT_ROLE = 'upgrader'

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
        // 找不到就变身 SUPPORT_ROLE
        else {
            support_roles[SUPPORT_ROLE].run(creep)
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