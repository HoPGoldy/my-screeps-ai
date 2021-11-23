/**
 * 资源平衡结果
 * 每个平衡结果都会转换成一个中央物流任务
 */
export interface BalanceResult<T extends BalanceDirection = BalanceDirection> {
    /**
     * 要转移的资源
     */
    resourceType: ResourceConstant
    /**
     * 要转移的数量
     */
    amount: number
    /**
     * 要转移的方向
     */
    direction: T
}

/**
 * 资源平衡方向
 */
export enum BalanceDirection {
    /**
     * 从终端搬到 storage
     */
    ToStorage = 1,
    /**
     * 从 storage 搬到终端
     */
    ToTerminal
}

/**
 * 房间资源存量
 */
export interface ResourceAmount {
    /**
     * 房间内的总可用数量
     */
    total: number
    /**
     * 该资源在 storage 中的存量
     */
    storage: number
    /**
     * 该资源在 terminal 中的存量
     */
    terminal: number
}
