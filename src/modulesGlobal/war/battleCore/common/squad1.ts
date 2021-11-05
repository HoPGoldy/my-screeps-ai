

import { createCache } from "@/utils"
import { contextCostMatrix, contextEnemyDamage } from "../../context"
import { getMaxEndure } from "./calculator"
import { getPathCacheKey, moveCreepByCachePath } from "./move"

/**
 * 一体机通用逻辑
 */

export interface SquadMoveContext {
    squadCode: string
    creep: Creep
    flee: boolean
    targetFlag: Flag
}

const [searchPath, refreshPath, dropPath] = createCache((context: SquadMoveContext) => {
    const { creep, flee, targetFlag } = context
    const getBaseCost = contextCostMatrix.use()
    const getEnemyDamage = contextEnemyDamage.use()

    const { path, ops, cost, incomplete } = PathFinder.search(creep.pos, { pos: targetFlag.pos, range: 1 }, {
        roomCallback: roomName => {
            const costs = getBaseCost(roomName)?.clone()
            if (!costs) return

            const enemyDamage = getEnemyDamage(roomName)
            const maxEndure = getMaxEndure(creep)

            enemyDamage.map((x, y, value) => {
                if (value === -1) return
                // 可以打穿自己的防御，这里不能走
                if (value >= maxEndure) costs.set(x, y, 255)
            })

            return costs
        },
        plainCost: 2,
        swampCost: 10,
        flee
    })

    // 缓存 5 格路径
    return path.slice(0, 5)
}, getPathCacheKey)

export const execSquadMove = function (context: SquadMoveContext) {
    const { squadCode, targetFlag, creep, flee } = context

    // 不在房间内，先走着，用 goTo 是因为 goTo 包含对穿，这样可以避免堵在出生房间
    if (!targetFlag.room || creep.room.name !== targetFlag.room.name) {
        creep.goTo(targetFlag.pos)
        return
    }

    // 到房间内了，进行更精细的移动
    const path = searchPath(context)
    moveCreepByCachePath(creep, path)

    if (path.length <= 0) dropPath(getPathCacheKey({ squadCode, flee }))
}