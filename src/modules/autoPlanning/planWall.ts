/**
 * 自动规划墙壁
 * 
 * @param room 要规划墙壁的房间
 * @param centerPos 基地中心点位置
 * @param distanceToCenter 外层墙壁到中心点的距离
 */
export default function (room: Room, centerPos: RoomPosition, distanceToCenter: number) {

}

/**
 * 获取目标房间中无法通行位置的 CostMatrix
 * 无法通行位置包括 wall，cwall，不属于自己的 rempart
 * 
 * @param room 目标房间
 * @return 无法通行位置的 CostMatrix
 */
const getImpassableCostMatrix = function (room: Room): CostMatrix {
    const terrain = new Room.Terrain(room.name)
    const matrix = new PathFinder.CostMatrix

    // 用默认地形成本填充 cost
    for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
            const tile = terrain.get(x, y)
            const weight = tile === TERRAIN_MASK_WALL ? 255 : 0
            matrix.set(x, y, weight)
        }
    }

    // 获取无法通过的墙壁
    const impassableWalls = room.find(FIND_STRUCTURES, {
        // 建造好的墙壁和不属于自己的 rampart
        filter: s => s.structureType === STRUCTURE_WALL ||
            (s.structureType === STRUCTURE_RAMPART && !s.my)
    })

    // 添加进 cost
    impassableWalls.forEach(wall => matrix.set(wall.pos.x, wall.pos.y, 255))

    return matrix
}

/**
 * 获取计划中要放置的最外层墙壁
 * 
 * @param impassableCostMatrix 房间的无法通行位置
 * @param centerPos 基地的中心位置
 * @param distanceToCenter 最外层墙壁到中心位置的距离
 */
const getOutWalls = function (impassableCostMatrix: CostMatrix, centerPos: RoomPosition, distanceToCenter: number): RoomPosition[] {
    const closeTile = new Map()
    const openTile = new Map()
    const outWalls: RoomPosition[] = []

    // 把初始坐标推入待蔓延区域
    openTile.set(getShortPosName(centerPos), centerPos)

    openTile.forEach((pos, key) => {
        const xs = [pos.x - 1, pos.x, pos.x + 1]
        const ys = [pos.y - 1, pos.y, pos.y + 1]

        // 遍历 x 和 y 坐标
        xs.forEach(x => ys.forEach(y => {
            // 如果不是墙则 ++
            if (terrain.get(x, y) != TERRAIN_MASK_WALL) result.push(new RoomPosition(x, y, this.roomName))
        }))
    })
}

/**
 * 从计划放置位置中筛选出需要的墙壁
 * 这个筛选是为了消除那些从房间入口处无法抵达的墙壁
 * 
 * @param room 房间实例
 * @param impassableCostMatrix 无法通行位置
 * @param outWalls 计划中要放置的位置
 */
const getNeededWalls = function (room: Room, impassableCostMatrix: CostMatrix, outWalls: RoomPosition[]): RoomPosition[] {

}

/**
 * 把需要的墙壁加厚指定厚度
 * 
 * @param impassableCostMatrix 无法通行位置
 * @param neededWalls 从入口可以抵达的墙壁数组
 * @param thickness 要加厚的厚度
 */
const getThickerWalls = function (impassableCostMatrix: CostMatrix, neededWalls: RoomPosition[], thickness: number = 2): RoomPosition[] {

}

/**
 * 获取目标 pos 的字符串标识
 */
const getShortPosName = function (pos: RoomPosition): string {
    return `${pos.x}-${pos.y}`
}