/**
 * 雷达主入口
 * 用于搜索指定房间的某些建筑并将其存入内存
 * 
 * @param {object} room 搜索的房间
 */
const scran = (room) => {
    try {
        Memory.radar[room] = {

        }
    }
    catch (e) {
        console.log(`警告！捕获到错误 ${e} 正在尝试进行检查`)
        checkMemory(roome)
    }
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

/**
 * 检查内存中是否包含正确的结构
 */
const checkMemory = (room) => {
    if (!Memory.radar) Memory.radar = {}
    if (!Memory.radar[room]) Memory.radar[room] = {}
}

module.exports = {
    scran
}