import { RoomInfo } from "../types";

export interface BatleContext<T extends Creep[] = Creep[], M extends AnyObject = AnyObject> {
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
     * 获取本房间的信息
     * 没有视野时返回 undefined
     *
     * @param roomName 要查询的房间名
     */
    getRoomInfo: (roomName: string) => RoomInfo,
    /**
     * 获取本房间的基础 costMatrix
     * 包含内容如下：双方creep 255，道路 1
     *
     * @param roomName 要查询的房间名
     */
    getBaseCost: (roomName: string) => CostMatrix
}

export type BattleCore<
    T extends Creep[] = Creep[],
    M extends AnyObject = AnyObject
> = (context: BatleContext<T, M>) => void