/**
 * 自动规划墙壁
 * @see /doc/墙壁自动规划.md
 * 
 * @param room 要规划墙壁的房间
 * @param centerPos 基地中心点位置
 * @param distanceToCenter 外层墙壁到中心点的距离
 * @param thickness 墙壁的厚度
 * 
 * @returns 需要建墙的位置
 */
export default function (room: Room, centerPos: RoomPosition, distanceToCenter: number = 7, thickness: number = 3): RoomPosition[][] {
    const cost = getImpassableCostMatrix(room)

    const outWall = getOutWalls(cost, centerPos, distanceToCenter)
    const [ neededWall, safeCost ] = getNeededWalls(room, cost, outWall)
    const targetWall = getThickerWalls(safeCost, neededWall, thickness)

    return targetWall
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
    const impassableWalls = [...room[STRUCTURE_WALL], ...room[STRUCTURE_RAMPART]].filter(s => !s.my)

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
    const walkedTile = new Map()
    const resultPos: RoomPosition[] = []

    // 把初始坐标推入待蔓延区域
    walkedTile.set(getShortPosName(centerPos), centerPos)

    // 遍历所有位置进行蔓延，找到目标墙壁位置
    walkedTile.forEach(spread(impassableCostMatrix, (pos, posName) => {
        // 距离够了就停止蔓延并加入最终结果
        if (pos.getRangeTo(centerPos) >= distanceToCenter) return resultPos.push(pos)
        // 如果不为墙并且待蔓延区域里也没有就加入待蔓延，后面再进行搜索
        if (!walkedTile.has(posName)) walkedTile.set(posName, pos)
    }))

    return resultPos
}

/**
 * 从计划放置位置中筛选出需要的墙壁
 * 这个筛选是为了剔除那些从房间入口处无法抵达的墙壁
 * 
 * @param room 房间实例
 * @param impassableCostMatrix 无法通行位置
 * @param outWalls 计划中要放置的位置
 */
const getNeededWalls = function (room: Room, impassableCostMatrix: CostMatrix, outWalls: RoomPosition[]): [ RoomPosition[], CostMatrix  ] {
    // 生成字符串标记，用于后面进行对比
    const outWallTags = outWalls.map(wall => getShortPosName(wall))
    // 安全区域 cost，下面会逐步把不安全的位置（连通块外区）设置成 255
    const safeCost = impassableCostMatrix.clone()

    const enters = room.find(FIND_EXIT)
    const walkedTile = new Map()
    const resultPos: RoomPosition[] = []

    // 把所有入口位置加入待检查队列
    enters.forEach(enter => walkedTile.set(getShortPosName(enter), enter))
    
    // 开始蔓延，会走遍所有没有被外墙包裹的地块
    walkedTile.forEach(spread(impassableCostMatrix, (pos, posName) => {
        // 踩到了之前计划中的墙壁，证明这个墙是需要的，加入最终结果
        if (outWallTags.includes(posName)) return resultPos.push(pos)

        if (!walkedTile.has(posName)) {
            // 加入待蔓延队列
            walkedTile.set(posName, pos)
            // 设置为不安全区域
            safeCost.set(pos.x, pos.y, 255)
        }
    }))

    return [ resultPos, safeCost ]
}

/**
 * 把需要的墙壁加厚指定厚度
 * 
 * @param impassableCostMatrix 无法通行位置（需要把墙壁外侧区域置为 255，不然墙也会向外侧加厚）
 * @param neededWalls 从入口可以抵达的墙壁数组
 * @param thickness 要加厚的厚度，这个值的大小等于返回数组的长度
 * @return 一个二维数组，每个数组都是一层完整的防御墙壁，便于分批建造
 */
const getThickerWalls = function (impassableCostMatrix: CostMatrix, neededWalls: RoomPosition[], thickness: number): RoomPosition[][] {
    // 已经存在的墙壁标识，会在下面使用避免重复
    const existWallTags = neededWalls.map(wall => getShortPosName(wall))
    // 最终的结果，肯定会包含之前筛查出来的墙
    const result = [ neededWalls ]

    // 计算迭代器，用该数组的长度控制蔓延了“几轮”，两轮就是加厚两层
    // 下面这个 +1 是因为需要在第一个元素放置蔓延起始墙壁
    const timer: RoomPosition[][] = new Array(thickness).fill([])
    timer[0] = neededWalls

    // 开始迭代，蔓延指定步长（多走一步墙就加厚一格）
    timer.reduce(baseWall => {
        const newBaseWall: RoomPosition[] = []

        baseWall.forEach(spread(impassableCostMatrix, (pos, posName) => {
            if (existWallTags.includes(posName)) return

            // 如果这个位置之前没有墙的话就更新结果
            newBaseWall.push(pos)
            existWallTags.push(posName)
        }))

        // 把本轮新产生的墙加入最终结果
        result.push(newBaseWall)
        // 用这一次蔓延的结果作为下一次蔓延的起点
        return newBaseWall
    })

    return result
}

/**
 * 向周围八个方向进行蔓延
 * 该函数会返回一个可以用于迭代的函数，用于为 spreadWork 回调包装上蔓延功能
 * 
 * @param impassableCostMatrix 包含无法通行位置的 CostMatrix（无法通行位置需要标注为 255）
 * @param spreadWork 在蔓延到位置上执行的回调
 * @return {(RoomPosition) => undefined} 一个方法，输入对应的位置就可以在其可以蔓延的位置上触发 spreadWork 回调
 */
const spread = function (impassableCostMatrix: CostMatrix, spreadWork: (pos: RoomPosition, posName: string) => any) {
    return (pos: RoomPosition) => {
        const xs = [pos.x - 1, pos.x, pos.x + 1]
        const ys = [pos.y - 1, pos.y, pos.y + 1]

        // 遍历 x 和 y 坐标
        xs.forEach(x => ys.forEach(y => {
            if (x < 1 || x > 48 || y < 1 || y > 48) return

            const cost = impassableCostMatrix.get(x, y)
            // 已经是墙了，停止蔓延
            if (cost === undefined || cost === 255) return

            // 这个位置可以蔓延，执行回调
            const currentPos = new RoomPosition(x, y, pos.roomName)
            const posName = getShortPosName(currentPos)
            spreadWork(currentPos, posName)
        }))
    }
}

/**
 * 获取目标 pos 的字符串标识
 */
const getShortPosName = function (pos: RoomPosition): string {
    return `${pos.x}-${pos.y}`
}