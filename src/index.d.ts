// 当 creep 不需要生成时 mySpawnCreep 返回的值
type CREEP_DONT_NEED_SPAWN = -101
// spawn.mySpawnCreep 方法的返回值集合
type MySpawnReturnCode = ScreepsReturnCode | CREEP_DONT_NEED_SPAWN

declare module NodeJS {
    // 全局对象
    interface Global {
        // 是否已经挂载拓展
        hasExtension: boolean
    }
}

/**
 * 建筑拓展
 * 有可能有自定义的 work 方法
 */
interface Structure {
    work?(): void
}

/**
 * Spawn 拓展
 */
interface StructureSpawn {
    addTask(taskName: string): number
    hasTask(taskName: string): boolean
    clearTask(): void
}

/**
 * Terminal 拓展
 */
interface StructureTerminal {
    commandMarket(config: IMarketTask): boolean
    commandTransfer(configs: IRoomTransferTask[]): boolean
}

// Factory 拓展
interface StructureFactory {
    make(resourceType: ResourceConstant): void
}

/**
 * Creep 拓展
 * 来自于 mount.creep.ts
 */
interface Creep {
    _id: string
    // 临时添加
    store: Store
    // ---
    work(): void
    updateState(workingMsg?: string, onStateChange?: Function): boolean
    checkEnemy(): boolean
    standBy(): void
    defense(): void
    fillSpawnEngry(backupStorageId?: string): boolean
    findPathInRoom(target: RoomPosition): PathStep[]
    farMoveTo(target: RoomPosition): 0|-1|-4|-11|-12|-5|-10
    fillTower(): boolean
    upgrade(): boolean
    buildStructure(): boolean
    repairStructure(): boolean
    fillDefenseStructure(expectHits?: number): boolean
    claim(): boolean
    getEngryFrom(target: Structure|Source): ScreepsReturnCode
    transferTo(target: Structure, RESOURCE: ResourceConstant): ScreepsReturnCode
    attackFlag()
    dismantleFlag()
    healTo(creeps: Creep[]): void
    getFlag(flagName: string): Flag|null
    isHealthy(): boolean
}

/**
 * 某个结构的位置信息
 */
interface IPositionInfo {
    id?: string
    roomName: string
    x: number
    y: number
}

/**
 * spawn 内存拓展
 * 
 * @property {string[]} spawnList 生产队列，元素为 creepConfig 的键名
 */
interface SpawnMemory {
    spawnList?: string[]
}

/**
 * creep 内存拓展
 * @property {} ready creep是否已经准备好可以工作了
 * @property {} role creep的角色
 * @property {} working 是否在工作
 * @property {} sourceId 外矿采集者特有 要采集的 Source Id
 * @property {} path 行进路线
 * @property {} targetPosTag 缓存路径的目标，该目标发生变化时刷新路径, 总是和上面的 path 成对出现
 * @property {} fillWallId 要填充的墙 id 
 * @property {} constructionSiteId 建筑工特有 当前缓存的建筑工地
 * @property {} dontBuild 外矿采集者特有, 该字段为 true 时, 每 tick 都会尝试检查工地并建造
 * @property {} expectHits 城墙填充特有，标志当前期望的城墙生命值
 * @property {} isStanBy 是否已经在待命位置, 此状态为 true 时，防御者的standBy方法将不会在调用pos.isEqualTo()
 */
interface CreepMemory {
    ready: boolean
    role: string
    working: boolean
    sourceId?: string
    path?: PathStep[]
    targetPosTag?: string
    fillWallId?: string
    constructionSiteId?: string
    dontBuild?: boolean
    expectHits?: number
    squad?: number
    isStanBy?: boolean
}

/**
 * 房间拓展
 */
interface Room {
    _enemys: Creep[]
    addTask(task: ITransferTask): number
    hasTask(submitId: string): boolean
    hangTask(): number
    handleTask(transferAmount: number): void
    getTask(): ITransferTask | null

    setFactoryTarget(resourceType: ResourceConstant): string
    getFactoryTarget(): ResourceConstant | null
    clearFactoryTarget(): string
}

/**
 * 房间内存
 * 
 * @property {} centerTransferTasks 中央集群的资源转移任务队列
 * @property {} factoryTarget 房间内工厂生产的目标
 * @property {} targetOrderId 房间内终端缓存的订单id
 * @property {} mineralId 房间内的元素矿id
 */
interface RoomMemory {
    centerTransferTasks: ITransferTask[]
    factoryTarget: ResourceConstant
    targetOrderId: string
    mineralId: string
}

/**
 * 资源转移任务
 * 
 * @property {} submitId 任务提交者 id
 * @property {} sourceId 资源的提供建筑 id
 * @property {} targetId 资源的接受建筑 id
 * @property {} resourceType 资源类型
 * @property {} amount 资源数量
 */
interface ITransferTask {
    submitId: string
    sourceId: string
    targetId: string
    resourceType:  ResourceConstant
    amount: number
}

/**
 * creep 的配置项
 * @property {} isNeed 在孵化前进行的判断，只有返回 true 时才会进行生成
 * @property {} prepare 准备阶段执行的方法
 * @property {} isReady 是否准备完成
 * @property {} source creep非工作(收集能量时)执行的方法
 * @property {} target creep工作时执行的方法
 * @property {} switch 更新状态时触发的方法, 该方法必须位于 Creep 上, 且可以返回 true/false
 * @property {} spawn 要进行生产的出生点
 * @property {} bodyType 身体部件类型, 必须是 setting.ts 中 bodyConfigs 中的键
 */
interface ICreepConfig {
    isNeed?: (room: Room) => boolean
    prepare?: (creep: Creep) => any
    isReady?: (creep: Creep) => boolean
    target?: (creep: Creep) => any
    source?: (creep: Creep) => any
    switch?: (creep: Creep) => boolean
    spawn: string
    bodyType: string
}

/**
 * creep 的配置项列表
 */
interface ICreepConfigs {
    [creepName: string]: ICreepConfig
}

// factory 配置项
interface IFactoryConfig {
    target: (factory: StructureFactory) => any
}

// factory 配置项列表
interface IFactoryConfigs {
    [factoryId: string]: IFactoryConfig
}

// Link 拓展
interface StructureLink {
    work(): void
    to(targetId: string): void
    asCenter(): void
}

/**
 * link 配置项
 * @property target link在准备好了的时候执行的方法
 */
interface ILinkConfig {
    target: (link: StructureLink) => any
}

/**
 * link 配置项列表
 */
interface ILinkConfigs {
    [linkId: string]: ILinkConfig
}

/**
 * 终端的发送任务
 * 发送任务是指 将指定资源转移到其他房间的“持续性”任务
 * 
 * @property {} targetRoom 要将资源转移到的房间名
 * @property {} type 要转移的资源类型
 * @property {} amount 一次转移的数量
 * @property {} holdAmount 保存在本地终端的该资源数量, 资源只有在 (总量 - amount >= holdAmount) 时才会转移
 */
interface IRoomTransferTask {
    targetRoom: string
    type: ResourceConstant
    amount: number
    holdAmount: number
}

/**
 * 终端的交易任务
 * 
 * @property {} type 值为 sell/bug 表示任务是卖出还是买入
 * @property {} resourceType 要交易的资源类型
 * @property {} amount 一次交易的数量
 * @property {} holdAmount 保存在本地终端的该资源数量, 资源只有在 (总量 - amount >= holdAmount) 时才会进行交易
 */
interface IMarketTask {
    type: string
    resourceType: MarketResourceConstant
    amount: number
    holdAmount: number
}

/**
 * 终端的配置项
 * 
 * @property {} market 该终端在市场中进行搜索的"持续性"任务
 * @property {} transferTasks 要和其他房间进行资源转移的任务列表
 */
interface ITerminalConfig {
    market?: IMarketTask
    transferTasks?: IRoomTransferTask[]
}

/**
 * terminal 配置项列表
 */
interface ITerminalConfigs {
    [roomName: string]: ITerminalConfig
}

/**
 * 从路径名到颜色的映射表
 */
interface IPathMap {
    [propName: string]: string
}

/**
 * 单个角色类型的身体部件配置
 * 从 1 ~ 8 的键表示房间从 1 级到 8 级的不同身体配置项
 */
interface BodyConfig {
    1: BodyPartConstant[]
    2: BodyPartConstant[]
    3: BodyPartConstant[]
    4: BodyPartConstant[]
    5: BodyPartConstant[]
    6: BodyPartConstant[]
    7: BodyPartConstant[]
    8: BodyPartConstant[]
}

/**
 * 身体配置项类别
 * 包含了所有角色类型的身体配置
 */
interface IBodyConfigs {
    [roleType: string]: BodyConfig
}