import { RoomTileMap } from "@/utils";
import { RoomInfo, WarState } from "../types";

/**
 * 所有可用的小队类型
 */
export enum SquadType {
    /**
     * 一体机
     */
    Monomer = 1
}

export const SquadTypeName: { [type in SquadType]: string } = {
    [SquadType.Monomer]: '一体机'
}

export interface BattleContext<T extends Creep[] = Creep[], M extends AnyObject = AnyObject> {
    /**
     * 小队成员
     * 应当将泛型 T 设置为 Creep 元组来指定小队人数
     */
    members: T,
    /**
     * 小队内存
     */
    memory: M,
    /**
     * 小队要进攻的目标旗帜
     */
    targetFlag: Flag,
    /**
     * 当前战争状态
     */
    warState: WarState,
    /**
     * 获取指定房间的信息
     * 没有视野时返回 undefined
     */
    getRoomInfo: (roomName: string) => RoomInfo | undefined,
    /**
     * 获取指定房间的基础 costMatrix
     * 包含内容如下：双方creep 255，墙壁根据血量 5-254，道路 1
     * （不包含其他建筑，不能走就拆过去）
     */
    getBaseCost: (roomName: string) => CostMatrix | undefined
    /**
     * 获取指定房间的敌方伤害值
     */
    getEnemyDamage: (roomName: string) => RoomTileMap<number> | undefined
}

/**
 * 战斗核心
 * 传入需要的素材，执行实际战斗逻辑
 */
export type BattleCore<
    T extends Creep[] = Creep[],
    M extends AnyObject = AnyObject
> = (context: BattleContext<T, M>) => void
