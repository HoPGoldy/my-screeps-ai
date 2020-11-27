/**
 * PowerCreep 内存拓展
 */
interface PowerCreepMemory {
    /**
     * 移动缓存
     */
    _go?: MoveInfo
    /**
     * 等同于 Creep.memory.fromShard
     */
    fromShard?: ShardName
    /**
     * pc 暂时没有角色
     */
    role: undefined
    /**
     * 为 true 时执行 target，否则执行 source
     */
    working: boolean
    /**
     * 接下来要检查哪个 power
     */
    powerIndex: number
    /**
     * 当前要处理的工作
     * 字段值均为 PWR_* 常量
     * 在该字段不存在时将默认执行 PWR_GENERATE_OPS（如果 power 资源足够并且 ops 不足时）
     */
    task: PowerConstant
    /**
     * 工作的房间名，在第一次出生时由玩家指定，后面会根据该值自动出生到指定房间
     */
    workRoom: string
    /**
     * 同 creep.memory.stand
     */
    stand: boolean
    /**
     * 同 creep.memory.disableCross
     */
    disableCross?: boolean
    /**
     * 要添加 REGEN_SOURCE 的 souce 在 room.sources 中的索引值
     */
    sourceIndex?: number
}

/**
 * pc 拓展
 * 来自于 mount.powerCreep.ts
 */
interface PowerCreep {
    /**
     * 发送日志
     * 
     * @param content 日志内容
     * @param instanceName 发送日志的实例名
     * @param color 日志前缀颜色
     * @param notify 是否发送邮件
     */
    log(content:string, color?: Colors, notify?: boolean): void
    
    updatePowerToRoom(): void
    _move(direction: DirectionConstant | Creep): CreepMoveReturnCode | ERR_NOT_IN_RANGE | ERR_INVALID_TARGET
    goTo(target?: RoomPosition, moveOpt?: MoveOpt): ScreepsReturnCode
    setWayPoint(target: string[] | string): ScreepsReturnCode
    requireCross(direction: DirectionConstant): Boolean
    enablePower(): OK | ERR_BUSY
    getOps(opsNumber: number): OK | ERR_NOT_ENOUGH_RESOURCES | ERR_BUSY
}

/**
 * 每种 power 所对应的的任务配置项
 * 
 * @property {} needExecute 该 power 的检查方法
 * @property {} run power 的具体工作内容
 */
interface IPowerTaskConfig {
    /**
     * power 的资源获取逻辑
     * 
     * @returns OK 任务完成，将会执行下面的 target 方法
     * @returns ERR_NOT_ENOUGH_RESOURCES 资源不足，将会强制切入 ops 生成任务
     * @returns ERR_BUSY 任务未完成，保留工作状态，后续继续执行
     */
    source?: (creep: PowerCreep) => OK | ERR_NOT_ENOUGH_RESOURCES | ERR_BUSY
    /**
     * power 的具体工作逻辑
     * 
     * @returns OK 任务完成，将会继续检查后续 power
     * @returns ERR_NOT_ENOUGH_RESOURCES 资源不足，将会执行上面的 source 方法，如果没有 source 的话就强制切入 ops 生成任务
     * @returns ERR_BUSY 任务未完成，保留工作状态，后续继续执行
     */
    target: (creep: PowerCreep) => OK | ERR_NOT_ENOUGH_RESOURCES | ERR_BUSY
}

/**
 * 所有 power 的任务配置列表
 */
interface PowerTaskConfigs {
    [powerType: string]: IPowerTaskConfig
}