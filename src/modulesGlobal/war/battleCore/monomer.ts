import { contextRoomInfo } from "../context";
import { BattleCore } from "../squadManager/types";
import { getMaxDamageCreep } from "./common/calculator";
import { execSquadMove } from "./common/squad1";

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
    const { squadCode, members: [creep], targetFlag } = context

    execAttack(creep, targetFlag)

    // 治疗自己，不会检查自己生命值，一直治疗
    // 因为本 tick 受到的伤害只有在下个 tick 才能发现，两个 tick 累计的伤害有可能会把 tough 打穿。
    creep.heal(creep)

    // 只要掉血了就往后撤
    const flee = creep.hits < creep.hitsMax
    execSquadMove({ squadCode, creep, flee, targetFlag })
}

/**
 * 执行一体机功击
 */
const execAttack = function (creep: Creep, targetFlag: Flag) {
    const getRoomInfo = contextRoomInfo.use()
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