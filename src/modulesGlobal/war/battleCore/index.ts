import { BattleCore, SquadType } from "../squadManager/types";
import { runMonomer } from "./monomer";

/**
 * 所有启动的战斗核心
 */
export const allBattleCore: { [Type in SquadType]: BattleCore } = {
    [SquadType.Monomer]: runMonomer
}