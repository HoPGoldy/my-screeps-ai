import { calcBodyPart } from "@/role/bodyUtils";
import { SquadType } from "../squadManager/types";

/**
 * 小队的孵化体型获取方法
 */
export const getBodyPart: { [type in SquadType]: () => BodyPartConstant[] } = {
    /**
     * 一体机配置，可以扛六塔满伤
     */
    [SquadType.Monomer]: () => calcBodyPart({ [TOUGH]: 12, [RANGED_ATTACK]: 5, [MOVE]: 10, [HEAL]: 23 })
}