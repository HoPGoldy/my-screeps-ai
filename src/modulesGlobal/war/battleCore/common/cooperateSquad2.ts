import { createCache, onEdge } from "@/utils"
import { contextCostMatrix, contextEnemyDamage } from "../../context"
import { getMaxEndure, getNextHeal } from "./calculator"
import { getPathCacheKey, moveCreepByCachePath } from "./move"

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

const [searchPath, refreshPath, dropPath] = createCache((context: SquadMoveContext) => {
    const { header, tailer, flee, targetFlag } = context
    const getBaseCost = contextCostMatrix.use()
    const getEnemyDamage = contextEnemyDamage.use()

    const { path, ops, cost, incomplete } = PathFinder.search(header.pos, { pos: targetFlag.pos, range: 1 }, {
        roomCallback: roomName => {
            const costs = getBaseCost(roomName)?.clone()
            if (!costs) return

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
        },
        plainCost: 2,
        swampCost: 10,
        flee
    })

    // 缓存 5 格路径
    return path.slice(0, 5)
}, getPathCacheKey)

/**
 * 执行小队移动逻辑
 */
export const execSquadMove = function (conetxt: SquadMoveContext) {
    const { header, tailer, targetFlag, squadCode, flee } = conetxt

    // 两个人不在一起，会合
    if (!header.pos.isNearTo(tailer)) {
        // 因为领头单位会优先跨过房间，这时候如果向跟随单位移动的话，两个人就会开始来回骑墙
        if (!onEdge(header.pos)) header.goTo(tailer.pos)
        tailer.goTo(header.pos)
    }

    // 没冷却好就不进行移动
    if (header.fatigue !== 0 || tailer.fatigue !== 0) return

    // 还没到房间
    if (!targetFlag.room || header.room.name !== targetFlag.room.name) {
        header.goTo(targetFlag.pos)
        tailer.goTo(header.pos)
        return
    }

    const path = searchPath(conetxt)

    // 前队按路径走，后队跟前队
    moveCreepByCachePath(header, path)
    tailer.moveTo(header)

    // 走到头了，丢弃缓存
    if (path.length <= 0) dropPath(getPathCacheKey({ squadCode, flee }))
}
