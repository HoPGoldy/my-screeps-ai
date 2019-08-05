const havestPath = require('moveSetting').getPath('havest')

/**
 * 去资源点挖矿
 * 
 * @param {object} creep 
 */
const harvestEngry = (creep) => {
    const closestSource = creep.pos.findClosestByPath(FIND_SOURCES)

    // 挖掘实现
    if (creep.harvest(closestSource, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(closestSource, havestPath)
    }
}

/**
 * 获取能量
 * 优先从 container 中获取，没有的话再去挖矿
 * 
 * @param {object} creep 
 */
function getEngry(creep) {
    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: structure => structure.structureType == STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] > 0
    })
    if (target) {
        if(creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, havestPath)
        }
    }
    else {
        harvestEngry(creep)
    }
}

/**
 * 状态更新
 * 
 * @param {object} creep 
 * @param {object} workingMsg 切换为工作状态时的语音提示
 * @param {function} callBack 状态切换时触发的回调
 */
const updateState = (creep, workingMsg='🧰 工作', callBack=()=>{}) => {
    // creep 身上没有能量 && creep 之前的状态为“工作”
    if(creep.carry.energy <= 0 && creep.memory.working) {
        // 切换状态
        creep.memory.working = false
        creep.say('⚡ 挖矿')
        callBack(creep, creep.memory.working)
    }
    // creep 身上能量满了 && creep 之前的状态为“不工作”
    if(creep.carry.energy >= creep.carryCapacity && !creep.memory.working) {
        // 切换状态
        creep.memory.working = true
        creep.say(workingMsg)
        callBack(creep, creep.memory.working)
    }

    return creep.memory.working
}

/**
 * 获取旗子所在位置上的指定结构
 * 只能搜索自己的结构 FIND_MY_STRUCTURES
 * 
 * @param {object} flag 旗子对象
 * @param {string} STRUCTURE_TYPE 结构名称，STRUCTURE_*
 * @returns {object|undefined} 指定的结构对象 没找到则返回undefined
 */
function getStructureByFlag(flag, STRUCTURE_TYPE) {
    const targets = flag.room.lookForAtArea(LOOK_STRUCTURES, flag.pos.y, flag.pos.x, flag.pos.y, flag.pos.x, true)

    return targets.find(target => target.structure.structureType = STRUCTURE_TYPE)
}

function getRunTime(func, ...args) {
    const startTime = new Date().getTime()
    func(...args)
    const endTime = new Date().getTime()

    console.log(`代码块执行共用时 ${endTime - startTime} 毫秒`)
}

module.exports = {
    harvestEngry,
    getEngry,
    updateState,
    getStructureByFlag,
    getRunTime
}