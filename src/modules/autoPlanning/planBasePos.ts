/**
 * 使用动态规划算法查找集中式基地布局的中心点
 */

// dp 节点
interface DpNode {
    // 以坐标 [i][j]（i 为纵坐标，j 为横坐标，下同）为右下角时所能生成的最大正方形的边长
    len: number
    // 以坐标 [i][j] 为右下角，[0][0] 为左上角的矩形区域内的沼泽数量之和
    swamp: number
}

// 房间的边长
const ROOM_MAX_SIZE = 50

/**
 * 在房间中找到所有可以放下基地的点
 * 会尽可能的挑选沼泽数量少的区域
 * 
 * @param roomName 运行规划的房间名
 * @param baseSize 正方形基地的尺寸
 * @returns 所有满足条件的房间位置
 */
export const findBaseCenterPos = function(roomName: string, baseSize: number = 11): RoomPosition[] {
    const terrain = new Room.Terrain(roomName)

    let dp: DpNode[][] = Array(ROOM_MAX_SIZE).fill(undefined).map(_ => [])
    // 合适的结果集
    let result: RoomPosition[] = []
    // 结果集里对应的沼泽数量
    let minSwamp = Infinity

    // 遍历所有地块
    for (let i = 0; i < ROOM_MAX_SIZE; i ++) {
        for (let j = 0; j < ROOM_MAX_SIZE; j ++) {
            const { topLeft, top, left } = getOtherArea(dp, i, j, 1)

            // 生成当前位置的状态
            dp[i][j] = {
                // 以当前位置为右下角，可以生成的最大正方形的边长
                len: terrain.get(j, i) === TERRAIN_MASK_WALL ? 0 : (Math.min(topLeft.len, top.len, left.len) + 1),
                // 以当前位置为右下角，[0][0] 为左上角的区域内所有的沼泽数量
                swamp: top.swamp + left.swamp - topLeft.swamp + (terrain.get(j, i) === TERRAIN_MASK_SWAMP ? 1 : 0)
            }

            // 发现该正方形已经可以满足要求了
            if (dp[i][j].len >= baseSize) {
                // 获取正方形右上侧的三个区域
                const { topLeft, top, left } = getOtherArea(dp, i, j, baseSize)
                // 计算出当前区域内的沼泽数量
                const currentSwamp = dp[i][j].swamp - top.swamp - left.swamp + topLeft.swamp

                // 沼泽数量不是最小的
                if (currentSwamp > minSwamp) continue

                const pos = getCenterBybottomRight(i, j, baseSize)
                const centerPos = new RoomPosition(pos[1], pos[0], roomName)

                // 对比沼泽数量并更新结果
                if (currentSwamp < minSwamp) {
                    minSwamp = currentSwamp
                    result = [ centerPos ]
                }
                else if (currentSwamp === minSwamp) result.push(centerPos)
            }
        }
    }

    return result
}

/**
 * 获取状态转移所需的三个相邻节点
 * 
 * @param dp 状态集
 * @param i 目标正方形右下角的 y 坐标
 * @param j 目标正方形右下角的 x 坐标
 * @param len 正方形的边长
 */
const getOtherArea = function(dp: DpNode[][], i: number, j: number, len: number): { topLeft: DpNode, top: DpNode, left: DpNode } {
    // 越界时的默认值
    const nullNode: DpNode = { len: 0, swamp: 0 }
    // 检查索引是否小于零，小于零就返回默认值
    return {
        topLeft: (i - len > -1 && j - len > -1) ? dp[i - len][j - len] : nullNode,
        top: (i - len > -1) ? dp[i - len][j] : nullNode,
        left: (j - len > -1) ? dp[i][j - len] : nullNode,
    }
}

/**
 * 获取该正方形中心点的坐标
 * 
 * @param i 正方形右下角的 y 坐标
 * @param j  正方形右下角的 x 坐标
 * @param len 正方形的边长
 * @returns [0] 为中央点 x 坐标，[1] 为 y 坐标
 */
const getCenterBybottomRight = function(i: number, j: number, len: number): [ number, number ] {
    return [
        i - (len / 2) + 0.5,
        j - (len / 2) + 0.5,
    ]
}

/**
 * 确定唯一的基地中心点
 * 
 * @param room 运行规划的房间
 * @param targetPos 待选的中心点数组
 * @returns 基地中心点
 */
export const confirmBasePos = function(room: Room, targetPos: RoomPosition[]): RoomPosition {
    if (!targetPos || targetPos.length <= 0) return undefined

    const controller = room.controller
    const mineral = room.mineral
    if (!controller || !mineral) return undefined

    // 所有待选点到 controller 和 mineral 的距离总和
    const totalDistances = targetPos.map((pos, index) => ({
        distance: pos.findPathTo(controller).length + pos.findPathTo(mineral).length,
        index
    }))

    // 找到最小值并返回对应的位置
    const target = _.min(totalDistances, item => item.distance)
    return targetPos[target.index]
}

/**
 * 给指定房间设置中心点
 * 
 * @param room 要设置中心点的房间
 * @param centerPos 中心点坐标
 */
export const setBaseCenter = function(room: Room, centerPos: RoomPosition): OK | ERR_INVALID_ARGS {
    if (!centerPos) return ERR_INVALID_ARGS

    room.memory.center = [ centerPos.x, centerPos.y ]
    return OK
}
