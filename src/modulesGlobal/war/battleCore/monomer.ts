import { BattleCore } from "../squadManager/types";
import { getMaxDamageCreep, getMaxEndure } from "../utils";

/**
 * 一体机战斗核心
 * 会一直治疗自己
 * 
 * 未进入房间时：治疗 + 移动
 * 进入房间：
 * - 移动：血量是否不满，不满则逃跑，满则向 flag 移动
 * - 功击：三格内有敌人就 rangedMassAttack，没有就 rangeAttack
 */
export const runMonomer: BattleCore<[Creep]> = function (context) {
    const { members: [creep], targetFlag, getBaseCost, getRoomInfo, getEnemyDamage } = context

    // 治疗自己，不会检查自己生命值，一直治疗
    // 因为本 tick 受到的伤害只有在下个 tick 才能发现，两个 tick 累计的伤害有可能会把 tough 打穿。
    creep.heal(creep)

    // 不在房间内，先走着，用 goTo 是因为 goTo 包含对穿，这样可以避免堵在出生房间
    if (!targetFlag.room || creep.room.name !== targetFlag.room.name) {
        creep.goTo(targetFlag.pos)
        return
    }
    // 到房间内了，进行更精细的移动
    else {
        const { path, ops, cost, incomplete } = PathFinder.search(creep.pos, { pos: targetFlag.pos, range: 1 }, {
            roomCallback: roomName => {
                const costs = getBaseCost(roomName)?.clone()
                if (!costs) return

                const enemyDamage = getEnemyDamage(roomName)
                const maxEndure = getMaxEndure(creep)
                console.log('maxEndure', creep.name, maxEndure)
                enemyDamage.map((x, y, value) => {
                    if (value === -1) return
                    // 可以打穿自己的防御，这里不能走
                    if (value >= maxEndure) costs.set(x, y, 255)
                })

                return costs
            },
            plainCost: 2,
            swampCost: 10,
            // 只要掉血了就往后撤
            flee: creep.hits < creep.hitsMax
        })

        creep.room.visual.poly(path)
        console.log('path', path, ops, cost, incomplete)

        creep.move(creep.pos.getDirectionTo(path[0]))
    }

    const { hostileCreeps, hostilePowerCreeps } = getRoomInfo(targetFlag.room.name)
    const inRangeHostile = creep.pos.findInRange([...hostileCreeps, ...hostilePowerCreeps], 3)

    // 优先功击威胁最大的 creep
    if (inRangeHostile.length > 0) {
        const pcs: PowerCreep[] = []
        const creeps: Creep[] = []
        inRangeHostile.forEach(hostile => 'body' in hostile ? creeps.push(hostile) : pcs.push(hostile))
        const [maxDamageCreep, damge] = getMaxDamageCreep(creeps)

        // creep 没伤害并且附近有 pc 的话就打 pc
        if (damge <= 0 && pcs.length > 0) creep.rangedAttack(pcs[0])
        // 否则就打 creep
        else if (maxDamageCreep) creep.rangedAttack(maxDamageCreep)
    }

    // 附近没有爬，无脑 mass
    creep.rangedMassAttack()
}