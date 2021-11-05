import { BattleCore, SquadType } from "../squadManager/types";
import { runMonomer } from "./monomer";
import { runDismantle2 } from './dismantle2';
import { runAttack2 } from './attack2';

/**
 * 所有可用的战斗核心
 */
export const allBattleCore: { [Type in SquadType]: BattleCore } = {
    [SquadType.Monomer]: runMonomer,
    [SquadType.Dismantle2]: runDismantle2,
    [SquadType.Attack2]: runAttack2
}