const { myInfo } = require('config')

/**
 * 雷达主入口
 * 用于搜索指定房间的某些建筑并将其存入内存
 * 
 * @param {object} room 搜索的房间
 */
const scan = (room) => {
    Memory[room.name].radarResult = {
        enemys: getEnermy(room)
    }
}

/**
 * 搜索敌人 creep
 * 
 * @param {object} room 搜索的房间
 * @returns {array|null} 搜索到的敌人 没找到则返回 null
 */
const getEnermy = (room) => {
    const enemys = room.find(FIND_HOSTILE_CREEPS)

    return enemys ? enemys : null
}

/**
 * 搜索需要维修的建筑
 * 
 * @param {object} room 搜索的房间
 */
const getNeedRepairStructure = (room) => {

}

/**
 * 搜索可以存放能量的建筑
 * 
 * @param {object} room 搜索的房间
 */
const getStoreStructure = (room) => {

}

module.exports = {
    scan
}