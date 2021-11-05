import { calcBodyPart } from "@/role/bodyUtils";
import { getUniqueKey } from "@/utils";
import { SoliderRole, SquadType } from "../squadManager/types";

type GetSquadMemberBodys = (room: Room) => {
    role: SoliderRole
    body: BodyPartConstant[]
}[]

/**
 * 小队的孵化体型获取方法
 */
export const getBodyPart: { [type in SquadType]: GetSquadMemberBodys } = {
    [SquadType.Monomer]: () => [
        { role: SoliderRole.Monomer, body: calcBodyPart([[TOUGH, 12], [RANGED_ATTACK, 5], [MOVE, 10], [HEAL, 23]]) }
    ],
    [SquadType.Dismantle2]: () => [
        { role: SoliderRole.Dismantler, body: calcBodyPart([[TOUGH, 12], [WORK, 28], [MOVE, 10]]) },
        { role: SoliderRole.Doctor, body: calcBodyPart([[TOUGH, 12], [HEAL, 25], [MOVE, 10]]) }
    ],
    [SquadType.Attack2]: () => [
        { role: SoliderRole.Attacker, body: calcBodyPart([[TOUGH, 12], [ATTACK, 28], [MOVE, 10]]) },
        { role: SoliderRole.Doctor, body: calcBodyPart([[TOUGH, 12], [HEAL, 25], [MOVE, 10]]) }
    ]
}

/**
 * 创建小队孵化信息
 * 
 * @param squadCode 小队代号
 * @param squadType 小队类型
 */
export const createSpawnInfo = function (spawnRoom: Room, squadCode: string, squadType: SquadType) {
    const bodys = getBodyPart[squadType](spawnRoom)
    const spawnInfo = {}
    bodys.forEach(body => spawnInfo[squadCode + getUniqueKey()] = body)
    return spawnInfo
}