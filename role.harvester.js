const { updateState, getClosestStructureByFlag } = require('utils')
const havestPath = require('moveSetting').getPath('havest')
const roleTransfer = require('role.transfer')

function run(creep) {
    if (!checkSource(creep)) return false

    // harvester 型 creep 的工作就是将能量带回存储点
    if (updateState(creep, '🚚 转移')) {
        if (!carryBack(creep)) {
            roleTransfer.run(creep)
        }
    }
    else {
        harvestEngry(creep)
    }
}

function harvestEngry(creep) {
    const sourceId = creep.memory.sourceId
    const closestSource = sourceId ? 
        Game.getObjectById(sourceId) : 
        creep.pos.findClosestByPath(FIND_SOURCES)


    // 挖掘实现
    if (creep.harvest(closestSource, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(closestSource, havestPath)
    }
}

/**
 * 检查资源点状态
 * 
 * @param {object} creep 
 * @returns {boolean} 可以工作返回 true, 不可以工作返回 false
 */
function checkSource(creep) {
    
    const sourcesMap = Memory[creep.room.name].sourcesMap
    // 如果只剩 10 ticks 的生命，则主动注销自己与矿的绑定
    if (creep.ticksToLive <= 50) {
        creep.say('我快不行了！')
        Memory[creep.room.name].sourcesMap[creep.memory.sourceId] = null
        return true
    }
    // 检查内存中是否包含 sourceId，没有的话尝试在 sourcesMap 中进行查找
    if (creep.memory.sourceId && creep.memory.sourceId != 'undefined') {
        return true
    }
    else {
        if (creep.name == 'harvester9241251') {
            console.log(typeof creep.memory.sourceId)
        }
        let availableSourceId = null
        // 检查到可用矿源就 break
        for (const sourceId in sourcesMap) {
            if (sourcesMap[sourceId] == null) {
                availableSourceId = sourceId
                break
            }
        }
        // 绑定矿
        if (availableSourceId) {
            creep.memory.sourceId = availableSourceId
            Memory[creep.room.name].sourcesMap[creep.memory.sourceId] = creep.name
        }
        else {
            console.log(`${creep.name} 未找到可用的矿源，情况 sourceMap`)
            clearSoureceMap(creep)
        }
    }
}

/**
 * 带回结构
 * 
 * @param {object} creep 
 * @returns {boolean} 成功就返回 true 没有目标则返回 false
 */
function carryBack(creep) {
    // memory.storeStructureId 标记着应该将能量存入哪个容器
    // 这个值在 getStoreStructure 方法中设置
    // 只有在目标结构为 container 时设置
    const storeStructureId = creep.memory.storeStructureId
    let target = storeStructureId ? 
        Game.getObjectById(storeStructureId) :
        getStoreStructure(creep)

        if(!target) return false
    
    // 转移能量实现
    if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, havestPath)
    }
    return true
}

/**
 * 查找可以存储的结构
 * 优先级 插着旗子的容器 > 拓展 > 出生点
 * 插着旗子的容器，旗子名字为 "房间名 + store + 矿id"
 * 
 * @param {object} creep 
 * @returns {object|undefined} 指定结构，找不到就返回 undefined
 */
function getStoreStructure(creep) {
    let storeStructure = undefined
    // 先找旗子
    const storeFlag = Game.flags[`${creep.room.name} store ${creep.memory.sourceId}`]
    // 有旗子就根据旗子找结构，没有就找容器或者出生点
    if (storeFlag) {
        storeStructure = getClosestStructureByFlag(storeFlag, STRUCTURE_CONTAINER)
        
        if (!storeStructure) console.log(`${storeFlag} 附近没有可用的 container`)
        else creep.memory.storeStructureId = storeStructure.id
    }
    else {
        storeStructure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: structure => {
                /**
                 * 条件优先满足：能量没有到达上限
                 * 然后根据排序挑选建筑：拓展 > 重生点 > 容器
                 */
                if (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) {
                    return structure.energy < structure.energyCapacity
                }
                else if (structure.structureType == STRUCTURE_CONTAINER) {
                    return _.sum(structure.store) < structure.storeCapacity
                }
                else {
                    return false
                }
            }
        })
    }

    return storeStructure
}

/**
 * 清空资源 sourceMap
 * 本方法为应急措施，sourceMap 主要由 creep 在濒死时取消注册
 * 但是若 creep 被杀死，则无法正常取消注册，就会导致其他新的 creep 无法从 sourceMap 中获取可用的资源
 * 从而卡死
 * 
 * @param {object} creep 
 */
function clearSoureceMap(creep) {
    for (const sourceId in Memory[creep.room.name].sourcesMap) {
        Memory[creep.room.name].sourcesMap[sourceId] = null
    }
}

module.exports = {
    run
}