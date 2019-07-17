const havestPath = require('moveSetting').getPath('havest')
const { harvestEngry, updateState } = require('utils')

const run = (creep) => {
    const working = updateState(creep, '🚛 带回')

    // worker 型 creep 的工作就是将能量带回基地
    if (working) {
        carryBack(creep)
    }
    else {
        // 检查地上的垃圾
        const dropEngry = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES)
        // 优先捡垃圾
        if (dropEngry) {
            pickDropEngry(creep, dropEngry)
        }
        // 没有再去采矿
        else {
            harvestEngry(creep)
        }
    }
}

/**
 * 捡垃圾
 * 
 * @param {object} creep 
 * @param {object} dropEngry 掉地上的能量
 */
const pickDropEngry = (creep, dropEngry) => {
    if(creep.pickup(dropEngry) == ERR_NOT_IN_RANGE) {
        creep.moveTo(dropEngry, havestPath)
    }
}

/**
 * 将矿带回存储点，可以自动搜索最近结构
 * @param {object} creep 
 */
const carryBack = (creep) => {
    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
            /**
             * 条件优先满足：能量没有到达上限
             * 
             * 然后根据排序挑选建筑：拓展 > 重生点 > 容器
             */
            return structure.energy < structure.energyCapacity && 
                   (structure.structureType == STRUCTURE_EXTENSION || 
                    structure.structureType == STRUCTURE_SPAWN)
        }
    })
    // 转移能量实现
    if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, defaultPath)
    }
}

module.exports = {
    run
}