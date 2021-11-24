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
