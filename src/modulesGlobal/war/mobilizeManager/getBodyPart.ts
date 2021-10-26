import { calcBodyPart } from "@/role/bodyUtils";
import { SquadType } from "../squadManager/types";

/**
 * 小队的孵化体型获取方法
 * 注意，这里返回的是一个身体部件二维数组
 * 每一个身体部件数组就是一个小队成员
 */
export const getBodyPart: { [type in SquadType]: () => BodyPartConstant[][] } = {
    /**
     * 一体机配置，可以扛六塔满伤
     */
    [SquadType.Monomer]: () => [calcBodyPart({ [TOUGH]: 12, [RANGED_ATTACK]: 5, [MOVE]: 10, [HEAL]: 23 })]
}