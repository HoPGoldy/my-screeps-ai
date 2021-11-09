import { contextRoomInfo } from "../context"
import { BattleCore } from "../squadManager/types"
import { RoomInfo } from "../types"
import { execSquadHeal, execSquadMove, getNamedMember, SquadMemberMemory } from "./common/cooperateSquad2"

type SquadMemory = SquadMemberMemory & {
    cacheAttackTargetId: Id<Creep | PowerCreep | AnyStructure>
}

/**
 * 黄绿球二人组
 */
export const runDismantle2: BattleCore<[Creep, Creep], SquadMemory> = function (context) {
    const { members, memory, targetFlag, squadCode, env } = context
    const { attacker, healer } = getNamedMember(WORK, memory, members)

    execAttack(attacker, memory, targetFlag, env.getObjectById)
    const flee = execSquadHeal(attacker, healer)

    // 根据是否逃跑决定头尾
    const header = flee ? healer : attacker
    const tailer = flee ? attacker : healer

    execSquadMove({ squadCode, header, tailer, flee, targetFlag })
}

/**
 * 执行小队功击
 * 
 * @param attacker 进攻手
 * @param target 进攻目标
 */
 const execAttack = function (
    attacker: Creep, memory: SquadMemory, targetFlag: Flag,
    getObjectById: typeof Game.getObjectById
) {
    if (!targetFlag.room || attacker.room.name !== targetFlag.room.name) return

    if (attacker.pos.isNearTo(targetFlag)) {
        const attackStructure = targetFlag.pos.lookFor(LOOK_STRUCTURES)
        if (attackStructure.length > 0) {
            attacker.dismantle(attackStructure[0])
            return
        }
    }

    if (memory.cacheAttackTargetId) {
        const cacheTarget = getObjectById(memory.cacheAttackTargetId)
        if (cacheTarget && cacheTarget.pos.isNearTo(attacker)) {
            attacker.dismantle(cacheTarget as Structure)
            return
        }

        delete memory.cacheAttackTargetId
    }

    const getRoomInfo = contextRoomInfo.use()
    const { structures } = getRoomInfo(targetFlag.room.name)

    // 血量由低到高给身边的建筑排序
    const nearStructures = attacker.pos.findInRange(structures, 1).sort((a, b) => b.hits - a.hits)
    if (nearStructures.length > 0) {
        attacker.dismantle(nearStructures[0])
        memory.cacheAttackTargetId = nearStructures[0].id
    }
    
}
