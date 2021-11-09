import { onEdge } from "@/utils"
import { contextEnemyDamage, contextOutside } from "../../context"
import { getMaxEndure, getNextHeal } from "./calculator"
import { searchPath, shiftNextMoveDirection, dropPath, getPathCacheKey } from "./move"

/**
 * 双人主从小队的通用逻辑
 * 主从小队是指一人专门功击，一人专门奶的小队
 */

/**
 * 双人小队成员内存
 */
export interface SquadMemberMemory {
    /**
     * 功击单位的名称
     */
    attackerName: string
    /**
     * 治疗单位的名称
     */
    healerName: string
}

/**
 * 将成员标记为功击者和治疗者
 * 
 * @param attackerBody 有这个 body 的将被视为功击单位
 * @param memory 要保存到的内存
 * @param members 小队成员
 */
export const getNamedMember = function (attackerBody: BodyPartConstant, memory: SquadMemberMemory, members: [Creep, Creep]) {
    if (!memory.attackerName) {
        if (members[0].body.find(body => body.type === attackerBody)) {
            memory.attackerName = members[0].name
            memory.healerName = members[1].name
        }
        else {
            memory.attackerName = members[1].name
            memory.healerName = members[0].name
        }
    }

    const attacker = members.find(c => c.name === memory.attackerName)
    const healer = members.find(c => c.name === memory.healerName)

    return { attacker, healer }
}

/**
 * 执行小队治疗
 * 
 * @param attacker 小队功击手
 * @param healer 小队治疗手
 * @returns 是否需要撤退
 */
export const execSquadHeal = function (attacker: Creep, healer: Creep): boolean {
    const attackerDamage = attacker.hitsMax - attacker.hits
    const healerDamage = healer.hitsMax - healer.hits

    // 俩人都满血，自动治疗并继续往前走
    if (attackerDamage === 0 && healerDamage === 0) {
        const healResult = healer.heal(attacker)
        if (healResult == ERR_NOT_IN_RANGE) healer.rangedHeal(attacker)

        return false
    }

    // 谁掉血多奶谁
    const target = attackerDamage >= healerDamage ? attacker : healer
    const healResult = healer.heal(target)
    if (healResult == ERR_NOT_IN_RANGE) healer.rangedHeal(target)

    // 如果下个 tick 奶不回来了就后撤
    return attackerDamage + healerDamage >= getNextHeal(healer)[0]
}

export interface SquadMoveContext {
    squadCode: string
    header: Creep
    tailer: Creep
    flee: boolean
    targetFlag: Flag
}

/**
 * 执行小队移动逻辑
 */
export const execSquadMove = function (conetxt: SquadMoveContext) {
    const { header, tailer, targetFlag, squadCode, flee } = conetxt
    const getEnemyDamage = contextEnemyDamage.use()
    const { goTo } = contextOutside.use()

    const pathResult = searchPath({
        startPos: header.pos,
        flee,
        targetFlag,
        squadCode,
        setCustomCost: (roomName, costs) => {
            const enemyDamage = getEnemyDamage(roomName)
            // 拿掉血多的计算伤害，这里不太科学
            const weakCreep = tailer.hitsMax - tailer.hits > header.hitsMax - header.hits ? tailer : header
            const maxEndure = getMaxEndure(weakCreep)

            enemyDamage.map((x, y, value) => {
                if (value === -1) return
                // 可以打穿防御，这里不能走
                if (value >= maxEndure) costs.set(x, y, 255)
            })

            return costs
        }
    })

    // 两个人不在一起，会合
    if (!header.pos.isNearTo(tailer) && !onEdge(header.pos)) {
        // 因为领头单位会优先跨过房间，这时候如果向跟随单位移动的话，两个人就会开始来回骑墙
        if (header.room.name === tailer.room.name) {
            header.move(header.pos.getDirectionTo(tailer))
            dropPath(getPathCacheKey({ squadCode, flee }))
        }
        // 如果在自己家里就用对穿移动，不然可能会出现两个人中间卡着一个人，三个人就都动不了的问题
        if (header.room?.controller?.my) goTo(tailer, header.pos)
        else tailer.move(tailer.pos.getDirectionTo(header))

        return
    }

    // 在自己家里，可能被堵住了，用对穿移动
    if (header.room?.controller?.my && pathResult.incomplete) {
        goTo(header, targetFlag.pos)
        goTo(tailer, targetFlag.pos)
        return
    } 

    // 没冷却好就不进行移动
    if (header.fatigue !== 0 || tailer.fatigue !== 0) return

    const nextMove = shiftNextMoveDirection(header.pos, pathResult.path)

    // 前队按路径走，后队跟前队
    header.move(nextMove)
    tailer.move(tailer.pos.getDirectionTo(header))
}
