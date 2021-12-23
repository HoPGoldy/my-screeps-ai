/**
 * 判断一个位置是否在房间入口处（是否骑墙）
 */
export const onEdge = function (pos: RoomPosition): boolean {
    return pos.x === 0 || pos.x === 49 || pos.y === 0 || pos.y === 49
}

/**
* 获取指定方向的相反方向
*
* @param direction 目标方向
*/
export const getOppositeDirection = function (direction: DirectionConstant): DirectionConstant {
    return <DirectionConstant>((direction + 3) % 8 + 1)
}

/**
 * 将指定位置序列化为字符串
 * 形如: 12/32/E1N2
 *
 * @param pos 要进行压缩的位置
 */
export const serializePos = function (pos: RoomPosition): string {
    return `${pos.x}/${pos.y}/${pos.roomName}`
}

/**
 * 将位置序列化字符串转换为位置
 * 位置序列化字符串形如: 12/32/E1N2
 *
 * @param posStr 要进行转换的字符串
 */
export const unserializePos = function (posStr: string): RoomPosition | undefined {
    // 形如 ["12", "32", "E1N2"]
    const [x, y, roomName] = posStr.split('/')

    if (!roomName) return undefined
    return new RoomPosition(Number(x), Number(y), roomName)
}

/**
 * 获取基准位置在目标方向上的位置
 *
 * @param origin 基准位置
 * @param direction 目标方向
 */
export const directionToPos = function (origin: RoomPosition, direction: DirectionConstant): RoomPosition | undefined {
    let targetX = origin.x
    let targetY = origin.y

    // 纵轴移动，方向朝下就 y ++，否则就 y --
    if (direction !== LEFT && direction !== RIGHT) {
        if (direction > LEFT || direction < RIGHT) targetY--
        else targetY++
    }
    // 横轴移动，方向朝右就 x ++，否则就 x --
    if (direction !== TOP && direction !== BOTTOM) {
        if (direction < BOTTOM) targetX++
        else targetX--
    }

    // 如果要移动到另一个房间的话就返回空，否则返回目标 pos
    if (targetX < 0 || targetY > 49 || targetX > 49 || targetY < 0) return undefined
    else return new RoomPosition(targetX, targetY, origin.roomName)
}

/**
 * 获取目标位置周围的开采位空位
 * 也会搜索建筑、工地
 */
export const getFreeSpace = function (origin: RoomPosition): RoomPosition[] {
    if (origin._freeSpace) return origin._freeSpace

    const terrain = new Room.Terrain(origin.roomName)
    const result: RoomPosition[] = []

    const xs = [origin.x - 1, origin.x, origin.x + 1]
    const ys = [origin.y - 1, origin.y, origin.y + 1]

    // 遍历 x 和 y 坐标
    xs.forEach(x => ys.forEach(y => {
        // 不会包含自己
        if (x === origin.x && y === origin.y) return
        // 如果不是墙则 ++
        if (terrain.get(x, y) !== TERRAIN_MASK_WALL) result.push(new RoomPosition(x, y, origin.roomName))
    }))

    // 附近会占据位置的游戏对象
    const nearGameObject = [
        ...origin.findInRange(FIND_STRUCTURES, 1),
        ...origin.findInRange(FIND_CONSTRUCTION_SITES, 1)
    ].filter(({ structureType }) => (
        structureType !== STRUCTURE_CONTAINER &&
        structureType !== STRUCTURE_RAMPART &&
        structureType !== STRUCTURE_ROAD
    ))

    // 筛掉会占据位置的对象
    origin._freeSpace = result.filter(pos => nearGameObject.every(obj => !obj.pos.isEqualTo(pos)))
    return origin._freeSpace
}

declare global {
    interface RoomPosition {
        /** 本 tick 的周围空余开采位缓存 */
        _freeSpace: RoomPosition[]
    }
}
