const { harvestEngry, updateState } = require('utils')

const run = (creep) => {
    const working = updateState(creep, '🚚 转移')
    
    if (working) {
        const targets = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                // 结构为塔
                return structure.structureType == STRUCTURE_TOWER
            }
        })

        if(targets.length > 0) {
            // 找到能量最少的那个 tower
            const target = targets.reduce((smallTarget, target) => {
                // console.log(smallTarget.enrgy, target.enrgy)
                return smallTarget.enrgy < target.enrgy ? smallTarget : target
            })
            
            transformTo(creep, target)
        }
    }
    else {
        harvestEngry(creep)
    }
}

/**
 * 向指定结构转移能量
 * 
 * @param {object} creep 
 * @param {object} target 要传递能量的结构
 */
const transformTo = (creep, target) => {
    if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}})
    }
}

module.exports = {
    run
}