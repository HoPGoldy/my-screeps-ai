import { EnvMethods } from "@/contextTypes";
import { WarState } from "../types";

/**
 * 小队成员角色
 * 由小队成员的身体类型决定，战争模块将根据这个类型对被打散的单位进行重组
 */
export enum SoliderRole {
    /** 蓝绿球 */
    Monomer = 1,
    /** 黄球 */
    Dismantler,
    /** 绿球 */
    Doctor,
    /** 红球 */
    Attacker
}

/**
 * 所有可用的小队类型
 */
export enum SquadType {
    Monomer = 1,
    Dismantle2,
    Attack2
}

/**
 * 小队类型对应的名字，用在控制台介绍中
 */
export const SquadTypeName: { [type in SquadType]: string } = {
    [SquadType.Monomer]: '一体机',
    [SquadType.Dismantle2]: '黄绿球二人组',
    [SquadType.Attack2]: '红绿球二人组'
}

export interface BattleContext<T extends Creep[] = Creep[], M extends AnyObject = AnyObject> {
    /**
     * 小队成员
     * 应当将泛型 T 设置为 Creep 元组来指定小队人数
     */
    members: T
    /**
     * 小队内存
     */
    memory: M
    /**
     * 小队要进攻的目标旗帜
     */
    targetFlag: Flag
    /**
     * 本小队代号
     */
    squadCode: string
    /**
     * 当前战争状态
     */
    warState: WarState
    /**
     * 环境依赖
     */
    env: EnvMethods
}

/**
 * 战斗核心
 * 传入需要的素材，执行实际战斗逻辑
 */
export type BattleCore<
    T extends Creep[] = Creep[],
    M extends AnyObject = AnyObject
> = (context: BattleContext<T, M>) => void
