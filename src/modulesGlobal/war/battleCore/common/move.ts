import { createCache } from "@/utils"
import { contextCostMatrix, contextRoomInfo } from "../../context"

/**
 * 获取小队路径缓存索引
 * 
 * @param squadCode 小队代号
 * @param flee 是否逃跑
 */
export const getPathCacheKey = ({ squadCode, flee }: { squadCode: string, flee: boolean }) => squadCode + flee

/**
 * 获取寻路 cost 缓存索引
 */
export const getMoveCacheKey = (squadCode: string, roomName: string) => squadCode + roomName

/**
 * 按照缓存路径移动 creep
 * 会修改缓存数组
 */
export const shiftNextMoveDirection = function (currentPos: RoomPosition, path: RoomPosition[]) {
    new RoomVisual(currentPos.roomName).poly(path)

    const nextPos = path.shift()
    let nextMove = currentPos.getDirectionTo(nextPos)
    // 这里找不到是因为跨房了，读出另一个房间的坐标然后移动过去
    if (!nextMove) {
        const nextPos = path.shift()
        nextMove = currentPos.getDirectionTo(nextPos)
    }

    return nextMove
}

export interface SquadMoveContext {
    squadCode: string
    startPos: RoomPosition
    setCustomCost?: (roomName: string, baseCost: CostMatrix) => CostMatrix
    flee: boolean
    targetFlag: Flag
}

export const [searchPath, refreshAllPath, dropPath] = createCache((context: SquadMoveContext) => {
    const { squadCode, startPos, flee, targetFlag, setCustomCost } = context
    const getBaseCost = contextCostMatrix.use()
    const getRoomInfo = contextRoomInfo.use()
    const moveCostCache = contextCostMatrix.use()

    let moveToRange = 1
    if (targetFlag.room) {
        const cantMoveOn = targetFlag.pos.lookFor(LOOK_STRUCTURES).find(s => !(
            s.structureType === STRUCTURE_ROAD ||
            s.structureType === STRUCTURE_CONTAINER ||
            (s.structureType === STRUCTURE_RAMPART && s.my)
        ))
        // 这个地块是可以走到的，将寻路范围设置为 0
        if (!cantMoveOn) moveToRange = 0
    }

    const searchResult = PathFinder.search(startPos, { pos: targetFlag.pos, range: moveToRange }, {
        roomCallback: roomName => {
            const costs = getBaseCost(roomName)?.clone()
            // 没有目标房间视野时使用缓存的寻路 cost
            if (!costs) return moveCostCache[getMoveCacheKey(squadCode, roomName)]

            const finalCosts = setCustomCost ? setCustomCost(roomName, costs) : costs
            moveCostCache[getMoveCacheKey(squadCode, roomName)] = finalCosts

            return finalCosts
        },
        plainCost: 2,
        swampCost: 40,
        flee
    })

    let reuseLength = 10
    const { hostileCreeps } = getRoomInfo(startPos.roomName) || {}
    if (hostileCreeps && hostileCreeps.length > 0) {
        const closestHostile = startPos.findClosestByRange(hostileCreeps)
        // 根据与敌方的距离找到缓存距离，有敌人就缓存彼此之间距离，确保缓存的路径里没有敌人能打到自己
        reuseLength = Math.max(Math.floor(startPos.getRangeTo(closestHostile) / 2), 1)
    }

    // console.log('pathResult', searchResult.path.map(pos => `${pos.roomName} ${pos.x} ${pos.y}`).join(' | '))
    searchResult.path = searchResult.path.slice(0, reuseLength)

    return searchResult
}, {
    getCacheKey: getPathCacheKey,
    // 当缓存用尽时才会重新搜索路径
    shouldReuse: reuseResult => reuseResult && reuseResult.path.length > 0
})