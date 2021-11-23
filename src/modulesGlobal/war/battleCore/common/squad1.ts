import { contextEnemyDamage, contextOutside } from '../../context'
import { getMaxEndure } from './calculator'
import { searchPath, shiftNextMoveDirection } from './move'

/**
 * 一体机通用逻辑
 */

export interface SquadMoveContext {
    squadCode: string
    creep: Creep
    flee: boolean
    targetFlag: Flag
}

export const execSquadMove = function (context: SquadMoveContext) {
    const { squadCode, targetFlag, creep, flee } = context
    const getEnemyDamage = contextEnemyDamage.use()
    const { goTo } = contextOutside.use()

    const pathResult = searchPath({
        startPos: creep.pos,
        squadCode,
        targetFlag,
        flee,
        setCustomCost: (roomName, costs) => {
            const enemyDamage = getEnemyDamage(roomName)
            const maxEndure = getMaxEndure(creep)

            enemyDamage.map((x, y, value) => {
                if (value === -1) return false
                // 可以打穿自己的防御，这里不能走
                if (value >= maxEndure) costs.set(x, y, 255)
                return true
            })

            return costs
        }
    })

    // 在自己家里，可能被堵住了，用对穿移动
    if (creep.room?.controller?.my && pathResult.incomplete) {
        goTo(creep, targetFlag.pos)
        return
    }

    if (creep.fatigue !== 0) return
    const nextMove = shiftNextMoveDirection(creep.pos, pathResult.path)
    creep.move(nextMove)
}
