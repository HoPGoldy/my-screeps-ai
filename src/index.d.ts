// 当 creep 不需要生成时 mySpawnCreep 返回的值
type CREEP_DONT_NEED_SPAWN = -101
// spawn.mySpawnCreep 方法的返回值集合
type MySpawnReturnCode = ScreepsReturnCode | CREEP_DONT_NEED_SPAWN

// 函数介绍构造函数的参数对象
interface IFunctionDescribe {
    // 该函数的用法
    title: string
    // 该函数的参数列表
    params?: {
        // 参数名
        name: string
        // 参数介绍
        desc: string
    }[]
    // 函数名
    functionName: string
}

declare module NodeJS {
    // 全局对象
    interface Global {
        // 是否已经挂载拓展
        hasExtension: boolean
        createHelp(functionInfo: IFunctionDescribe[]): string
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
 */
interface CreepMemory {
    // creep是否已经准备好可以工作了
    ready: boolean
    // creep的角色
    role: string
    // 是否在工作
    working: boolean
    // 外矿采集者特有 要采集的 Source Id
    sourceId?: string
    // 远程寻路的行进路线缓存
    path?: PathStep[]
    // 缓存路径的目标，该目标发生变化时刷新路径, 总是和上面的 path 成对出现
    targetPosTag?: string
    // 要填充的墙 id 
    fillWallId?: string
    // transfer 特有 要填充能量的建筑 id
    fillStructureId?: string
    // 建筑工特有 当前缓存的建筑工地
    constructionSiteId?: string
    // 外矿采集者特有, 该字段为 true 时, 每 tick 都会尝试检查工地并建造
    dontBuild?: boolean
    // 城墙填充特有，当前期望的城墙生命值
    expectHits?: number
    // 攻击者的小队编号 暂时未使用
    squad?: number
    // 是否已经在待命位置, 此状态为 true 时，防御者的standBy方法将不会在调用pos.isEqualTo()
    isStanBy?: boolean
}

/**
 * 房间拓展
 * 来自于 mount.structure.ts
 */
interface Room {
    // 已拥有的房间特有，tower 负责维护
    _enemys: Creep[]
    // 外矿房间特有，外矿单位维护
    // 一旦该字段为 true 就告诉出生点暂时禁止自己重生直到 1500 tick 之后
    _hasEnemy: boolean
    // 当该字段为 true 时, repairer 角色将专心刷墙
    // 由房间中的 tower 负责更新
    _towerShoulderRepair: boolean
    // 该房间需要填充能量的建筑数组
    _needFillEnergyStructures: AnyOwnedStructure[]
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
 */
interface RoomMemory {
    // 中央集群的资源转移任务队列
    centerTransferTasks: ITransferTask[]
    // 房间内工厂生产的目标
    factoryTarget: ResourceConstant
    // 终端监听矿物列表
    // 键为资源名称，值为资源期望数量
    terminalTasks: {
        [resourceType: string]: number
    }
    // 房间内终端缓存的订单id
    targetOrderId: string
    // 当前终端要监听的资源索引
    terminalIndex: number
    // 房间内的元素矿id
    mineralId: string
    
    // Link 的专用内存字段
    links?: {
        // 使用 link id 来标注其角色
        [linkId: string]: string
    }
    // 中央 link 的 id，source Link 会通过这个字段进行查找
    centerLinkId?: string
    // 升级 link 的 id，source / center Link 会通过这个字段进行查找
    upgradeLinkId?: string

    // 外矿专用内存字段
    remote: {
        // 对应名称的 creep 在指定的 tick 之后才能生成
        // 该属性一般由外矿 creep 在发现有入侵者之后设置
        // spawn 在发现到达指定 tick 后会移除对应的属性
        [creepName: string]: number
    }

    // 该房间是否暂时不再需要进行能量填充
    allStructureFillEnergy: boolean
}

interface FlagMemory {
    // 因为外矿房间有可能没视野
    // 所以把房间名缓存进内存
    roomName: string
}

/**
 * 资源转移任务
 */
interface ITransferTask {
    // 任务提交者 id
    submitId: string
    // 资源的提供建筑 id
    sourceId: string
    // 资源的接受建筑 id
    targetId: string
    // 资源类型
    resourceType:  ResourceConstant
    // 资源数量
    amount: number
}

/**
 * creep 的角色配置项
 */
interface ICreepConfig {
    //在孵化前进行的判断，只有返回 true 时才会进行生成
    isNeed?: (room: Room) => boolean
    // 准备阶段执行的方法
    prepare?: (creep: Creep) => any
    // 是否准备完成
    isReady?: (creep: Creep) => boolean
    // creep工作时执行的方法
    target?: (creep: Creep) => any
    // creep 非工作(收集能量时)执行的方法
    source?: (creep: Creep) => any
    // 更新状态时触发的方法, 该方法必须位于 Creep 上
    switch?: (creep: Creep) => boolean
    // 要进行生产的出生点
    spawn: string
    // 身体部件类型, 必须是 setting.ts 中 bodyConfigs 中的键
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
    asCenter(): string
    asSource(): string
    asUpgrade(): string
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
 */
interface IRoomTransferTask {
    // 要将资源转移到的房间名
    targetRoom: string
    // 要转移的资源类型
    type: ResourceConstant
    // 一次转移的数量
    amount: number
    // 保存在本地终端的该资源数量, 资源只有在 (总量 - amount >= holdAmount) 时才会转移
    holdAmount: number
}

/**
 * 终端的交易任务
 */
interface IMarketTask {
    // 值为 sell/bug 表示任务是卖出还是买入
    type: string
    // 要交易的资源类型
    resourceType: MarketResourceConstant
    // 一次交易的数量
    amount: number
    // 保存在本地终端的该资源数量, 资源只有在 (总量 - amount >= holdAmount) 时才会进行交易
    holdAmount: number
}

/**
 * 终端的配置项
 */
interface ITerminalConfig {
    // 该终端在市场中进行搜索的"持续性"任务
    market?: IMarketTask
    // 要和其他房间进行资源转移的任务列表
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