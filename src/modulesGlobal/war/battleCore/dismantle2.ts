import { onEdge } from "@/utils";
import { BattleCore } from "../squadManager/types";
import { getNextHeal } from "./common/calculator";

interface SquadMemory {
    /**
     * 功击单位的名称
     */
    workerName: string
    /**
     * 治疗单位的名称
     */
    healerName: string
}

/**
 * 黄绿球二人组
 */
export const runMonomer: BattleCore<[Creep, Creep], SquadMemory> = function (context) {
    const { members, memory, targetFlag, getBaseCost, getRoomInfo, getEnemyDamage } = context
    const { worker, healer } = getNamedMember(memory, members)

    execSquadHeal(worker, healer)

}

const getNamedMember = function (memory: SquadMemory, members: [Creep, Creep]) {
    if (!memory.workerName) {
        if (members[0].body.find(body => body.type === WORK)) {
            memory.workerName = members[0].name
            memory.healerName = members[1].name
        }
        else {
            memory.workerName = members[1].name
            memory.healerName = members[0].name
        }
    }

    const worker = members.find(c => c.name === memory.workerName)
    const healer = members.find(c => c.name === memory.healerName)

    return { worker, healer }
}

const execSquadHeal = function (worker: Creep, healer: Creep): boolean {
    const workerDamage = worker.hitsMax - worker.hits
    const healerDamage = healer.hitsMax - healer.hits

    // 俩人都满血，自动治疗并继续往前走
    if (workerDamage === 0 && healerDamage === 0) {
        const healResult = healer.heal(worker)
        if (healResult == ERR_NOT_IN_RANGE) healer.rangedHeal(worker)

        return false
    }

    // 谁掉血多奶谁
    const target = workerDamage >= healerDamage ? worker : healer
    const healResult = healer.heal(target)
    if (healResult == ERR_NOT_IN_RANGE) healer.rangedHeal(target)

    // 如果下个 tick 奶不回来了就后撤
    return workerDamage + healerDamage >= getNextHeal(healer)[0]
}

const execSquadMove = function (worker: Creep, healer: Creep, flee: boolean, target: Flag) {
    // 根据是否逃跑决定头尾
    const header = flee ? healer : worker
    const tailer = flee ? worker : healer

    // 两个人不在一起，会合
    if (!header.pos.isNearTo(tailer)) {
        // worker 作为领头
        if (!onEdge(header.pos)) worker.goTo(tailer.pos)
        tailer.goTo(header.pos)
    }

    // 没冷却好就不进行移动
    if (header.fatigue !== 0 || tailer.fatigue !== 0) return

    // 还没到房间
    if (!target.room || header.room.name !== target.room.name) {
        header.goTo(target.pos)
        tailer.goTo(header.pos)
        return
    }


}
