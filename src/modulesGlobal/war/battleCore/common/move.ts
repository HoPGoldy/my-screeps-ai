/**
 * 获取小队路径缓存索引
 * 
 * @param squadCode 小队代号
 * @param flee 是否逃跑
 */
export const getPathCacheKey = ({ squadCode, flee }: { squadCode: string, flee: boolean }) => squadCode + flee

/**
 * 按照缓存路径移动 creep
 * 会修改缓存数组
 */
export const moveCreepByCachePath = function (creep: Creep, path: RoomPosition[]) {
    if (creep.fatigue) return

    const nextPos = path.shift()
    let nextMove = creep.pos.getDirectionTo(nextPos)
    // 这里找不到是因为跨房了，读出另一个房间的坐标然后移动过去
    if (!nextMove) {
        const nextPos = path.shift()
        nextMove = creep.pos.getDirectionTo(nextPos)
    }

    creep.room.visual.poly(path)
    creep.move(nextMove)
}