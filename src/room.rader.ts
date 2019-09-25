/**
 * 雷达主入口
 * 用于搜索指定房间的某些建筑并将其存入内存
 * 
 * @param room 搜索的房间
 */
export default function (room: Room): void {
    Memory[room.name].radarResult = {
        enemys: getEnermy(room)
    }
}

/**
 * 搜索敌人 creep
 * @todo 返回敌人的 id
 * 
 * @param room 搜索的房间
 * @returns {array|null} 搜索到的敌人 没找到则返回 null
 */
function getEnermy (room: Room): Creep[]|null {
    const enemys = room.find(FIND_HOSTILE_CREEPS)

    return enemys ? enemys : null
}