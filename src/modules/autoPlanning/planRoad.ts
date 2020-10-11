/**
 * 本模块是用来自动放置那些集中布局之外的道路
 * 
 * 包括基地到 controller、source、mineral 这些道路
 * 会自动对可复用的道路进行合并
 */

/**
 * 生成指定房间需要的 Cost
 * 
 * @param room 要生成 cost 的房间
 * @param structurePlacePlan 该房间的静态建筑规划结果
 */
const getRoomCost = function (room: Room, structurePlacePlan: StructurePlanningResult): CostMatrix {
    const terrain = new Room.Terrain(room.name)
    const matrix = new PathFinder.CostMatrix

    // 用默认地形成本填充 cost
    for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
            const tile = terrain.get(x, y)
            // WALL 255，SWAMP 5，PLAIN 2
            const weight = tile === TERRAIN_MASK_WALL ? 255 : (tile === TERRAIN_MASK_SWAMP ? 10 : 2)
                
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

    // 将建筑规划中的建筑添加进去（哪怕他还没造起来）
    for (let i = 0; i < 8; i ++) {
        const currentLevelLayout = structurePlacePlan[i]

        // 遍历布局中所有建筑类型
        Object.keys(currentLevelLayout).forEach((structureType: BuildableStructureConstant) => {
            // 遍历该建筑下的所有预放置点位
            currentLevelLayout[structureType].map((pos: RoomPosition) => {
                // 如果是道路，就降低 cost
                if (structureType === STRUCTURE_ROAD) matrix.set(pos.x, pos.y, 1)
                // 如果是 rampart 和 container就保持不变
                else if (structureType === STRUCTURE_RAMPART || structureType === STRUCTURE_CONTAINER) { }
                // 其他建筑都不能走
                else matrix.set(pos.x, pos.y, 255)
            })
        })
    }

    return matrix
}

/**
 * 给指定房间规划道路
 * 
 * @param room 要规划道路的房间
 * @param centerPos 房间的中心位置
 * @param structurePlacePlan 房间的静态建筑规划结果
 * @returns 可以通过数组解构出三个 RoomPosition 数组，分别是到 source、到 controller、到 mineral 的道路位置
 */
export default function (room: Room, centerPos: RoomPosition, structurePlacePlan: StructurePlanningResult): [ RoomPosition[], RoomPosition[], RoomPosition[] ] {
    const cost = getRoomCost(room, structurePlacePlan)

    /**
     * 寻找从基地中心点到目标位置的路
     * 
     * @param targetPos 要寻找的目标终点
     */
    const findPath = (targetPos: RoomPosition) => {
        const searchResult = PathFinder.search(centerPos, targetPos, {
            plainCost: 2,
            swampCost: 10,
            roomCallback: (roomName) => {
                // 不是自己房间就正常进行搜索
                if (roomName !== room.name) return true
    
                // 使用填入了布局信息的 cost
                return cost
            }
        })
    
        return searchResult.path.filter(pathPos => {
            // 把新选择的道路加入 cost，这样就可以让后面的规划尝试复用新道路
            cost.set(pathPos.x, pathPos.y, 1)
    
            // 只会建造本房间内的道路
            return pathPos.roomName === room.name
        })
    }

    // 到 Source 的路径
    const pathToSource: RoomPosition[] = []
    for (const source of room.sources) {
        const resultPos = findPath(source.pos)

        // 这么操作实际上两条路可能是有重复的 pos 的，不过问题不大
        pathToSource.push(...resultPos)
    }

    // 到 Controller 的路径
    const pathToController: RoomPosition[] = findPath(room.controller.pos)

    // 到 Mineral 的路径
    const pathToMineral: RoomPosition[] = findPath(room.mineral.pos)

    return [ pathToSource, pathToController, pathToMineral ]
}

