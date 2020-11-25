// 当 creep 不需要生成时 mySpawnCreep 返回的值
type CREEP_DONT_NEED_SPAWN = -101
// spawn.mySpawnCreep 方法的返回值集合
type MySpawnReturnCode = ScreepsReturnCode | CREEP_DONT_NEED_SPAWN

// 本项目中出现的颜色常量
type Colors = 'green' | 'blue' | 'yellow' | 'red'

/**
 * creep 能从中获取能量的建筑
 */
type EnergySourceStructure = StructureLink | StructureContainer | StructureTerminal | StructureStorage

/**
 * 所有能量来源
 * 
 * creep 将会从这些地方获取能量
 */
type AllEnergySource = Source | EnergySourceStructure

/**
 * 绘制帮助时需要的模块信息
 */
interface ModuleDescribe {
    // 模块名
    name: string
    // 模块介绍
    describe: string
    // 该模块的 api 列表
    api: FunctionDescribe[]
}

// 函数介绍构造函数的参数对象
interface FunctionDescribe {
    // 该函数的用法
    title: string
    // 参数介绍
    describe?: string
    // 该函数的参数列表
    params?: {
        // 参数名
        name: string
        // 参数介绍
        desc: string
    }[]
    // 函数名
    functionName: string
    // 是否为直接执行类型：不需要使用 () 就可以执行的命令
    commandType?: boolean
}

declare module NodeJS {
    // 全局对象
    interface Global {
        InterShardMemory: InterShardMemory
    }
}

/**
 * Game 对象拓展
 */
interface Game {
    // 本 tick 是否需要执行保存 InterShardMemory
    _needSaveInterShardData: boolean
}

// 所有的 creep 角色
type CreepRoleConstant = BaseRoleConstant | AdvancedRoleConstant | RemoteRoleConstant | WarRoleConstant

// 房间基础运营
type BaseRoleConstant = 
    'harvester' |
    'collector' |
    'miner' |
    'upgrader' |
    'filler' |
    'builder' |
    'repairer'

// 房间高级运营
type AdvancedRoleConstant = 
    'manager' |
    'processor'

// 远程单位
type RemoteRoleConstant = 
    'claimer' |
    'reserver' |
    'signer' |
    'remoteBuilder' |
    'remoteUpgrader' |
    'remoteHarvester' |
    'depositHarvester' |
    'pbAttacker' |
    'pbHealer' |
    'pbCarrier' |
    'moveTester' |
    'reiver'

// 战斗单位
type WarRoleConstant =
    'soldier' |
    'doctor' |
    'boostDoctor' |
    'dismantler' |
    'boostDismantler' |
    'apocalypse' |
    'defender'

// creep 名字生成器集合
type CreepNameGenerator = {
    [role in CreepRoleConstant]?: (room: string, index?: number, ...args: any[]) => string
}

/**
 * creep 工作逻辑集合
 * 包含了每个角色应该做的工作
 */
type CreepWork = {
    [role in CreepRoleConstant]: (data: CreepData) => ICreepConfig
}

/**
 * Creep 角色功能逻辑
 */
interface ICreepConfig {
    /**
     * 该 creep 是否需要
     * 
     * 每次死后都会进行判断，只有返回 true 时才会重新发布孵化任务
     * 该方法为空则默认持续孵化
     */
    isNeed?: (room: Room, creepName: string, preMemory: CreepMemory) => boolean

    /**
     * 准备阶段
     * 
     * creep 出生后会执行该方法来完成一些需要准备的工作，返回 true 时代表准备完成
     * 该方法为空则直接进入 source 阶段
     */
    prepare?: (creep: Creep) => boolean

    /**
     * 获取工作资源阶段
     * 
     * 返回 true 则执行 target 阶段，返回其他将继续执行该方法
     * 该方法为空则一直重复执行 target 阶段
     */
    source?: (creep: Creep) => boolean

    /**
     * 工作阶段
     * 
     * 返回 true 则执行 source 阶段，返回其他将继续执行该方法
     * 该方法不可未空
     */
    target: (creep: Creep) => boolean

    // 每个角色默认的身体组成部分
    bodys: (room: Room, spawn: StructureSpawn) => BodyPartConstant[]
}

/**
 * 所有 creep 角色的 data
 */
type CreepData = 
    EmptyData |
    ReiverData |
    HarvesterData | 
    WorkerData | 
    ProcessorData | 
    RemoteHelperData | 
    RemoteDeclarerData |
    RemoteHarvesterData |
    pbAttackerData |
    WarUnitData |
    ApocalypseData |
    HealUnitData

/**
 * 有些角色不需要 data
 */
interface EmptyData { }

/**
 * 采集单位的 data
 * 执行从 sourceId 处采集东西，并转移至 targetId 处（不一定使用，每个角色都有自己固定的目标例如 storage 或者 terminal）
 */
interface HarvesterData {
    // 要采集的 source id
    sourceId: Id<Source>
    // 把采集到的资源存到哪里存在哪里
    targetId: Id<EnergySourceStructure>
}

/**
 * 工作单位的 data
 * 由于由确定的工作目标所以不需要 targetId
 */
interface WorkerData {
    // 要使用的资源存放建筑 id
    sourceId: Id<EnergySourceStructure>
}

/**
 * 中央运输者的 data 
 * x y 为其在房间中的固定位置
 */
interface ProcessorData {
    x: number
    y: number
}

/**
 * 远程协助单位的 data
 */
interface RemoteHelperData {
    // 要支援的房间名
    targetRoomName: string
    // 该房间中的能量来源
    sourceId: Id<Source | StructureContainer | StructureStorage | StructureTerminal>
}

/**
 * 掠夺者单位的 data
 */
interface ReiverData {
    // 目标建筑上的旗帜名称
    flagName: string
    // 要搬运到的建筑 id
    targetId: Id<StructureWithStore>
}

/**
 * 远程声明单位的 data
 * 这些单位都会和目标房间的 controller 打交道
 */
interface RemoteDeclarerData {
    // 要声明控制的房间名
    targetRoomName: string
    // 自己出生的房间，claim 需要这个字段来向老家发布支援 creep
    spawnRoom?: string
    // 给控制器的签名
    signText?: string
}

/**
 * 远程采集单位的 data
 * 包括外矿采集和公路房资源采集单位
 */
interface RemoteHarvesterData {
    // 要采集的资源旗帜名称
    sourceFlagName: string
    // 资源要存放到哪个建筑里，外矿采集者必须指定该参数
    targetId?: Id<StructureWithStore>
    // 出生房名称，资源会被运输到该房间中
    spawnRoom?: string
}

interface pbAttackerData {
    // 要采集的资源旗帜名称
    sourceFlagName: string
    // 资源要存放到哪个建筑里，外矿采集者必须指定该参数
    healerCreepName: string
    // 出生房名称，资源会被运输到该房间中
    spawnRoom: string
}

/**
 * 战斗单位的 data
 */
interface WarUnitData {
    // 要攻击的旗帜名
    targetFlagName: string
    // 其治疗者名称，战斗单位会尽量保持该单位和自己相邻
    healerName?: string
    // 待命位置旗帜名
    // standByFlagName: string
    // 是否持续孵化
    keepSpawn: boolean
}

/**
 * 一体机战斗单位的 data
 */
interface ApocalypseData {
    // 要攻击的旗帜名
    targetFlagName: string
    // 抗几个塔的伤害，由这个参数决定其身体部件组成
    bearTowerNum: 0 | 1 | 2 | 3 | 4 | 5 | 6
    // 是否持续孵化
    keepSpawn: boolean
}

/**
 * 治疗单位的 data
 */
interface HealUnitData {
    // 要治疗的旗帜名
    creepName: string
    // 待命位置旗帜名
    // standByFlagName: string
    // 是否持续孵化
    keepSpawn?: boolean
}

/**
 * creep 的自动规划身体类型，以下类型的详细规划定义在 setting.ts 中
 */
type BodyAutoConfigConstant = 
    'harvester' |
    'worker' |
    'manager' |
    'processor' |
    'reserver' |
    'attacker' |
    'healer' |
    'dismantler' |
    'remoteHarvester'

/**
 * 建筑拓展
 */
interface Structure {
    // 是否为自己的建筑，某些建筑不包含此属性，也可以等同于 my = false
    my?: boolean
    /**
     * 发送日志
     * 
     * @param content 日志内容
     * @param instanceName 发送日志的实例名
     * @param color 日志前缀颜色
     * @param notify 是否发送邮件
     */
    log(content:string, color?: Colors, notify?: boolean): void
    // 建筑的工作方法
    work?(): void
    // 建筑在完成建造时触发的回调
    onBuildComplete?(): void
}

interface StructureController {
    // 检查房间内敌人是否有威胁
    checkEnemyThreat(): boolean
}

// Factory 拓展
interface StructureFactory {
    // 查看工厂状态，在 room 的 fshow 中调用
    stats(): string
}

interface StructureTerminal {
    // 平衡 power
    balancePower(): OK | ERR_NOT_ENOUGH_RESOURCES | ERR_NAME_EXISTS | ERR_NOT_FOUND
}

interface StructurePowerSpawn {
    // 查看状态
    stats(): string
}

/**
 * Creep 拓展
 * 来自于 mount.creep.ts
 */
interface Creep {
    /**
     * 发送日志
     * 
     * @param content 日志内容
     * @param instanceName 发送日志的实例名
     * @param color 日志前缀颜色
     * @param notify 是否发送邮件
     */
    log(content:string, color?: Colors, notify?: boolean): void

    work(): void
    checkEnemy(): boolean
    standBy(): void
    defense(): void
    goTo(target?: RoomPosition, moveOpt?: MoveOpt): ScreepsReturnCode
    setWayPoint(target: string[] | string): ScreepsReturnCode
    requireCross(direction: DirectionConstant): Boolean
    mutualCross(direction: DirectionConstant): OK | ERR_BUSY | ERR_INVALID_TARGET
    upgrade(): ScreepsReturnCode
    buildStructure(): CreepActionReturnCode | ERR_NOT_ENOUGH_RESOURCES | ERR_RCL_NOT_ENOUGH | ERR_NOT_FOUND
    fillDefenseStructure(expectHits?: number): boolean
    getEngryFrom(target: StructureWithStore | Source): ScreepsReturnCode
    transferTo(target: Structure, RESOURCE: ResourceConstant): ScreepsReturnCode
    attackFlag(flagName: string): boolean
    rangedAttackFlag(flagName: string): boolean
    smass(): void
    dismantleFlag(flagName: string, healerName?: string): boolean
    healTo(creep: Creep): void
    getFlag(flagName: string): Flag|null
    steadyWall(): OK | ERR_NOT_FOUND
}

/**
 * Creep 拓展
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
 * 包含 store 属性的建筑
 */
type StructureWithStore = StructureTower | StructureStorage | StructureContainer | StructureExtension | StructureFactory | StructureSpawn | StructurePowerSpawn | StructureLink | StructureTerminal | StructureNuker

/**
 * creep 内存拓展
 */
interface CreepMemory {
    // 内置移动缓存
    _move?: Object

    /**
     * 移动缓存
     */
    _go?: MoveInfo

    /**
     * 来自的 shard
     * 在死后会向这个 shard 发送孵化任务
     * creepController 会通过这个字段检查一个 creep 是不是跨 shard creep
     */
    fromShard?: ShardName

    /**
     * 自己是否会向他人发起对穿
     */
    disableCross?: boolean

    // creep 是否已经准备好可以工作了
    ready?: boolean
    // creep 的角色
    role: CreepRoleConstant
    // 是否在工作
    working: boolean
    // creep 在工作时需要的自定义配置，在孵化时由 spawn 复制
    data?: CreepData

    /**
     * 该 Creep 是否在进行工作（站着不动）
     * 该字段用于减少 creep 向 Room.restrictedPos 里添加自己位置的次数
     */
    stand?: boolean
    // 要采集的资源 Id
    sourceId?: Id<AllEnergySource>
    // 要存放到的目标建筑
    targetId?: Id<Source | StructureWithStore | ConstructionSite>

    // deposit 采集者特有，deposit 的类型
    depositType?: DepositConstant
    // 要填充的墙 id 
    fillWallId?: Id<StructureWall | StructureRampart>
    // manager 特有 要填充能量的建筑 id
    fillStructureId?: Id<StructureWithStore>
    // 建筑工特有，当前缓存的建筑工地（目前只有外矿采集者在用）
    constructionSiteId?: Id<ConstructionSite>
    // 可以执行建筑的单位特有，当该值为 true 时将不会尝试建造
    dontBuild?: boolean
    // manager 特有，当前任务正在转移的资源类型
    taskResource?: ResourceConstant
    // 城墙填充特有，当前期望的城墙生命值
    expectHits?: number
    // 攻击者的小队编号 暂时未使用
    squad?: number
    // 是否已经在待命位置, 此状态为 true 时，防御者的standBy方法将不会在调用 pos.isEqualTo()
    isStanBy?: boolean
    // collector 允许自己再次尝试发布 power 强化 Soruce 任务的时间
    // 在 Game.time 小于该值时不会尝试发布强化任务
    regenSource?: number

    // 移动到某位置需要的时间
    // 例如：miner 会用它来保存移动到 mineral 的时间
    travelTime?: number
    // 目标旗帜的名称
    targetFlagName?: string

    // rangeSoldier 特有，是否启用 massAttack
    massMode?: boolean
}

/**
 * 房间拓展
 * 来自于 mount.structure.ts
 */
interface Room {
    /**
     * 发送日志
     * 
     * @param content 日志内容
     * @param instanceName 发送日志的实例名
     * @param color 日志前缀颜色
     * @param notify 是否发送邮件
     */
    log(content:string, instanceName?: string, color?: Colors, notify?: boolean): void

    // 已拥有的房间特有，tower 负责维护
    _enemys: (Creep|PowerCreep)[]
    // 需要维修的建筑，tower 负责维护，为 1 说明建筑均良好
    _damagedStructure: AnyStructure | 1
    // 该 tick 是否已经有 tower 刷过墙了
    _hasFillWall: boolean
    // 外矿房间特有，外矿单位维护
    // 一旦该字段为 true 就告诉出生点暂时禁止自己重生直到 1500 tick 之后
    _hasEnemy: boolean
    // 焦点墙，维修单位总是倾向于优先修复该墙体
    _importantWall: StructureWall | StructureRampart
    // 该房间是否已经执行过 lab 集群作业了
    // 在 Lab.work 中调用，一个房间只会执行一次
    _hasRunLab: boolean
    // 该房间是否已经运行过工地作业了
    _hasRunConstructionSite: boolean

    // 房间基础服务
    [STRUCTURE_FACTORY]?: StructureFactory
    [STRUCTURE_POWER_SPAWN]?: StructurePowerSpawn
    [STRUCTURE_NUKER]?: StructureNuker
    [STRUCTURE_OBSERVER]?: StructureObserver
    [STRUCTURE_EXTRACTOR]?: StructureExtractor

    [STRUCTURE_SPAWN]?: StructureSpawn[]
    [STRUCTURE_EXTENSION]?: StructureExtension[]
    [STRUCTURE_ROAD]?: StructureRoad[]
    [STRUCTURE_WALL]?: StructureWall[]
    [STRUCTURE_RAMPART]?: StructureRampart[]
    [STRUCTURE_KEEPER_LAIR]?: StructureKeeperLair[]
    [STRUCTURE_PORTAL]?: StructurePortal[]
    [STRUCTURE_LINK]?: StructureLink[]
    [STRUCTURE_TOWER]?: StructureTower[]
    [STRUCTURE_LAB]?: StructureLab[]
    [STRUCTURE_CONTAINER]?: StructureContainer[]

    mineral?: Mineral
    source?: Source[]
    centerLink?: StructureLink
    sourceContainers?: StructureContainer[]

    // pos 处理 api
    serializePos(pos: RoomPosition): string
    unserializePos(posStr: string): RoomPosition | undefined

    // power 任务 api
    addPowerTask(task: PowerConstant, priority?: number): OK | ERR_NAME_EXISTS | ERR_INVALID_TARGET
    deleteCurrentPowerTask(): void
    getPowerTask(): PowerConstant | undefined
    hangPowerTask(): void

    // creep 发布 api
    releaseCreep(role: BaseRoleConstant | AdvancedRoleConstant, number?: number): ScreepsReturnCode
    addRemoteCreepGroup(remoteRoomName: string)
    addRemoteReserver(remoteRoomName): void
    addRemoteHelper(remoteRoomName): void
    removePbHarvesteGroup(attackerName: string, healerName: string): void
    spawnPbCarrierGroup(flagName: string, number: number): void

    /**
     * 下述方法在 @see /src/mount.room.ts 中定义
     */
    // 孵化队列 api
    addSpawnTask(taskName: string): number | ERR_NAME_EXISTS
    hasSpawnTask(taskName: string): boolean
    clearSpawnTask(): void
    hangSpawnTask(): void

    // 中央物流 api
    addCenterTask(task: ITransferTask, priority?: number): number
    hasCenterTask(submit: CenterStructures | number): boolean
    hangCenterTask(): number
    handleCenterTask(transferAmount: number): void
    getCenterTask(): ITransferTask | null
    deleteCurrentCenterTask(): void

    // 房间物流 api
    addRoomTransferTask(task: RoomTransferTasks, priority?: number): number
    hasRoomTransferTask(taskType: string): boolean
    getRoomTransferTask(): RoomTransferTasks | null
    handleLabInTask(resourceType: ResourceConstant, amount: number): boolean
    deleteCurrentRoomTransferTask(): void

    // 工厂 api
    setFactoryTarget(resourceType: ResourceConstant): string
    getFactoryTarget(): ResourceConstant | null
    clearFactoryTarget(): string

    // 资源共享 api
    giver(roomName: string, resourceType: ResourceConstant, amount?: number): string
    shareRequest(resourceType: ResourceConstant, amount: number): boolean
    shareAddSource(resourceType: ResourceConstant): boolean
    shareRemoveSource(resourceType: ResourceConstant): void
    shareAdd(targetRoom: string, resourceType: ResourceConstant, amount: number): boolean

    // boost api
    boost(boostType: string, boostConfig: IBoostConfig): OK | ERR_NAME_EXISTS | ERR_NOT_FOUND | ERR_INVALID_ARGS | ERR_NOT_ENOUGH_RESOURCES
    boostCreep(creep: Creep): OK | ERR_NOT_FOUND | ERR_BUSY | ERR_NOT_IN_RANGE

    // 战争相关
    startWar(boostType: BoostType): OK | ERR_NAME_EXISTS | ERR_NOT_FOUND | ERR_INVALID_TARGET
    stopWar(): OK | ERR_NOT_FOUND

    // 获取房间中的有效能量来源
    getAvailableSource(): StructureTerminal | StructureStorage | StructureContainer | Source

    // 自动规划相关
    findBaseCenterPos(): RoomPosition[]
    confirmBaseCenter(targetPos?: RoomPosition[]): RoomPosition | ERR_NOT_FOUND
    setBaseCenter(pos: RoomPosition): OK | ERR_INVALID_ARGS
    planLayout(): string
    addRemote(remoteRoomName: string, targetId: string): OK | ERR_INVALID_TARGET | ERR_NOT_FOUND
    removeRemote(remoteRoomName: string, removeFlag?: boolean): OK | ERR_NOT_FOUND
    claimRoom(targetRoomName: string, signText?: string): OK
    registerContainer(container: StructureContainer): OK
}

interface RoomPosition {
    directionToPos(direction: DirectionConstant): RoomPosition | undefined
    getFreeSpace(): RoomPosition[]
}

/**
 * 工厂的任务队列中的具体任务配置
 */
interface IFactoryTask {
    // 任务目标
    target: CommodityConstant,
    // 该任务要生成的数量
    amount: number
}

/**
 * 房间内存
 */
interface RoomMemory {
    // 由驻守在房间中的 pc 发布，包含了 pc 拥有对应的能力
    // 形如: "1 3 13 14"，数字即为对应的 PWR_* 常量
    powers?: string
    // 该房间发起移除操作的时间
    // 执行移除时会检查该时间，如果已经过期的话将不会执行移除操作 
    removeTime?: number
    // 该房间的生产队列，元素为 creepConfig 的键名
    spawnList?: string[]
    // 该房间禁止通行点的存储
    // 键为注册禁止通行点位的 creep 名称，值为禁止通行点位 RoomPosition 对象的序列字符串
    restrictedPos?: {
        [creepName: string]: string
    }
    // 需要放置的工地（CS）队列
    delayCSList: string[]

    // 基地中心点坐标, [0] 为 x 坐标, [1] 为 y 坐标
    center: [ number, number ]
    // 基地中心的待选位置, [0] 为 x 坐标, [1] 为 y 坐标
    centerCandidates?: [ number, number ][]
    // 是否关闭自动布局，该值为 true 时将不会对本房间运行自动布局
    noLayout: boolean

    // observer 内存
    observer: {
        // 上个 tick 已经 ob 过的房间名
        checkRoomName?: string
        // 遍历 watchRooms 所使用的索引
        watchIndex: number
        // 监听的房间列表
        watchRooms: string[]
        // 当前已经找到的 powerBank 和 deposit 旗帜名数组，会自动进行检查来移除消失的旗帜信息
        pbList: string[]
        depoList: string[]
        // 是否暂停，为 true 时暂停
        pause?: boolean
    }
    // 中央集群的资源转移任务队列
    centerTransferTasks: ITransferTask[]
    // 房间物流任务队列
    transferTasks: RoomTransferTasks[]
    // power 任务请求队列
    // 由建筑物发布，powerCreep 查找任务时会优先读取该队列
    powerTasks: PowerConstant[]

    // 建筑工的当前工地目标，用于保证多个建筑工的工作统一以及建筑工死后不会寻找新的工地
    constructionSiteId: Id<ConstructionSite>
    // 建筑工特有，当前正在修建的建筑类型，用于在修建完成后触发对应的事件
    constructionSiteType?: StructureConstant
    // 建筑工地的坐标，用于在建造完成后进行 lookFor 来确认其是否成功修建了建筑
    constructionSitePos: number[]
    
    // 工厂内存
    factory: {
        // 当前房间的等级，由用户指定
        level?: 1 | 2 | 3 | 4 | 5
        // 下个顶级产物索引
        targetIndex: number
        // 本工厂参与的生产线类型
        depositTypes?: DepositConstant[]
        // 当该字段为真并且工厂在冷却时，就会执行一次底物是否充足的检查，执行完就会直接将该值移除
        produceCheck?: boolean
        // 当前工厂所处的阶段
        state: string
        // 工厂生产队列
        taskList: IFactoryTask[]
        // 工厂是否即将移除
        // 在该字段存在时，工厂会搬出所有材料，并在净空后移除 room.factory 内存
        // 在净空前手动删除该字段可以终止移除进程
        remove?: true
        // 工厂是否暂停，该属性优先级高于 sleep，也就是说 sleep 结束的时候如果有 pause，则工厂依旧不会工作
        pause?: true
        // 工厂休眠时间，如果该时间存在的话则工厂将会待机
        sleep?: number
        // 休眠的原因
        sleepReason?: string
        // 玩家手动指定的目标，工厂将一直合成该目标
        specialTraget?: CommodityConstant
    }
    
    // 终端监听矿物列表
    // 数组中每一个字符串都代表了一个监听任务，形如 "0 0 power"，第一位对应 TerminalModes，第二位对应 TerminalChannels，第三位对应资源类型
    terminalTasks: string[]
    // 房间内终端缓存的订单id
    targetOrderId?: Id<Order>
    // 房间内终端要立刻支援的房间名
    targetSupportRoom?: string
    // 当前终端要监听的资源索引
    terminalIndex: number
    
    // source 旁的 container id
    sourceContainersIds: Id<StructureContainer>[]
    // 中央 link 的 id
    centerLinkId?: Id<StructureLink>
    // 升级 link 的 id
    upgradeLinkId?: Id<StructureLink>

    // 一个游戏时间，标注了 mineral 什么时候会回满
    // 由 miner 发布，Extractor 会监听这个字段，并在适当的时间重新发布 mineral
    mineralCooldown: number

    // 外矿专用内存字段
    remote: {
        // 外矿房间名
        [roomName: string]: {
            // 该外矿什么时候可以恢复采集，在被入侵时触发
            disableTill?: number
            // 该外矿要把能量运到哪个建筑里，保存下来是为了后面方便自动恢复外矿采集
            targetId: Id<StructureWithStore>
        }
    }

    // 当前被 repairer 或 tower 关注的墙
    focusWall: {
        id: Id<StructureWall | StructureRampart>
        endTime: number
    }

    // 当前房间所处的防御模式
    // defense 为基础防御，active 为主动防御，该值未定义时为日常模式
    defenseMode?: 'defense' | 'active'

    // 该房间要执行的资源共享任务
    shareTask: IRoomShareTask

    lab?: LabMemory

    /**
     * 战争状态
     */
    war?: { }

    /**
     * boost 强化任务
     * @see doc/boost设计案
     */
    boost?: BoostTask

    // powerSpawn 是否暂停
    pausePS?: boolean

    /**
     * storage 要在其他建筑里维持的能量
     * 目前只支持 terminal
     */
    energyKeepInfo?: {
        terminal?: {
            amount: number
            limit: number
        }
    }
}

/**
 * lab 集群所需的信息
 * @see doc/lab设计案
 */
interface LabMemory {
    // 当前集群的工作状态
    state: string
    // 当前生产的目标产物索引
    targetIndex: number
    // 当前要生产的数量
    targetAmount?: number
    // 底物存放 lab 的 id
    inLab: Id<StructureLab>[]
    // 反应进行后下次反应进行的时间，值为 Game.time + cooldown
    reactionRunTime?: number
    // lab 是否暂停运行
    pause: boolean
}

// 所有房间物流任务
type RoomTransferTasks = IFillTower | IFillExtension | IFillNuker | ILabIn | ILabOut | IBoostGetResource | IBoostGetEnergy | IBoostClear | IFillPowerSpawn

// 房间物流任务 - 填充拓展
interface IFillExtension {
    type: string
}

// 房间物流任务 - 填充塔
interface IFillTower {
    type: string
    id: Id<StructureTower>
}

// 房间物流任务 - 填充核弹
interface IFillNuker {
    type: string
    id: Id<StructureNuker>
    resourceType: ResourceConstant
}

// 房间物流任务 - 填充 PowerSpawn
interface IFillPowerSpawn {
    type: string
    id: Id<StructurePowerSpawn>
    resourceType: ResourceConstant
}

// 房间物流任务 - lab 底物填充
interface ILabIn {
    type: string
    resource: {
        id: Id<StructureLab>
        type: ResourceConstant
        amount: number
    }[]
}

// 房间物流任务 - lab 产物移出
interface ILabOut {
    type: string
}

// 房间物流任务 - boost 资源填充
interface IBoostGetResource {
    type: string
}

// 房间物流任务 - boost 能量填充
interface IBoostGetEnergy {
    type: string
}

// 房间物流任务 - boost 资源清理
interface IBoostClear {
    type: string
}

interface transferTaskOperation {
    // creep 工作时执行的方法
    target: (creep: Creep, task: RoomTransferTasks) => boolean
    // creep 非工作(收集资源时)执行的方法
    source: (creep: Creep, task: RoomTransferTasks, sourceId: Id<StructureWithStore>) => boolean
}

// 房间要执行的资源共享任务
// 和上面的资源共享任务的不同之处在于，该任务是发布在指定房间上的，所以不需要 source
interface IRoomShareTask {
    // 资源的接受房间
    target: string
    // 共享的资源类型
    resourceType: ResourceConstant,
    // 期望数量
    amount: number
}

interface Memory {
    // 移动的次数
    moveNumber?: number
    // 移动消耗总用时
    moveUseCpu?: number
    // 移动寻路总用时
    movePathFindUseCpu?: number

    // 是否显示 cpu 消耗
    showCost?: boolean

    // 核弹投放指示器
    // 核弹是否已经确认
    nukerLock?: boolean
    // 核弹发射指令集，键为发射房间，值为目标旗帜名称
    nukerDirective?: {
        [fireRoomName: string]: string
    }

    // 全局的喊话索引
    sayIndex?: number
    // 白名单，通过全局的 whitelist 对象控制
    // 键是玩家名，值是该玩家进入自己房间的 tick 时长
    whiteList: {
        [userName: string]: number
    }
    // 掠夺资源列表，如果存在的话 reiver 将只会掠夺该名单中存在的资源
    reiveList: ResourceConstant[]
    // 要绕过的房间名列表，由全局模块 bypass 负责。
    bypassRooms: string[]
    // 资源来源表
    resourceSourceMap: {
        // 资源类型为键，房间名列表为值
        [resourceType: string]: string[]
    },
    // 商品生产线配置
    commodities: {
        // 键为工厂等级，值为被设置成对应等级的工厂所在房间名
        1: string[]
        2: string[]
        3: string[]
        4: string[]
        5: string[]
    }

    /**
     * 所有 creep 的配置项，每次 creep 死亡或者新增时都会通过这个表来完成初始化
     */
    creepConfigs: {
        [creepName: string]: {
            // creep 的角色名
            role: CreepRoleConstant
            // creep 的具体配置项，每个角色的配置都不相同
            data: CreepData
            // 执行 creep 孵化的房间名
            spawnRoom: string
        }
    }

    /**
     * 从其他 shard 跳跃过来的 creep 内存会被存放在这里
     * 等 creep 抵达后在由其亲自放在 creepConfigs 里
     * 
     * 不能直接放在 creepConfigs
     * 因为有可能出现内存到了但是 creep 还没到的情况，这时候 creepController 就会以为这个 creep 死掉了从而直接把内存回收掉
     */
    crossShardCreeps: {
        [creepName: string]: CreepMemory
    }

    // 全局统计信息
    stats: {
        // GCl/GPL 升级百分比
        gcl?: number
        gclLevel?: number
        gpl?: number
        gplLevel?: number
        // CPU 当前数值及百分比
        cpu?: number
        // bucket 当前数值
        bucket?: number
        // 当前还有多少钱
        credit?: number

        // 已经完成的房间物流任务比例
        roomTaskNumber?: {
            [roomTransferTaskType: string]: number
        }

        /**
        * 房间内的数据统计
        */
        rooms: {
            [roomName: string]: {
                // storage 中的能量剩余量
                energy?: number
                // 终端中的 power 数量
                power?: number
                // nuker 的资源存储量
                nukerEnergy?: number
                nukerG?: number
                nukerCooldown?: number
                // 控制器升级进度，只包含没有到 8 级的
                controllerRatio?: number
                controllerLevel?: number

                // 其他种类的资源数量，由 factory 统计
                [commRes: string]: number
            }
        }
    }

    // 启动 powerSpawn 的房间名列表
    psRooms: string[]

    // 在模拟器中调试布局时才会使用到该字段，在正式服务器中不会用到该字段
    layoutInfo?: BaseLayout
    // 用于标记布局获取到了那一等级
    layoutLevel?: AvailableLevel
}

interface FlagMemory {
    // deposit 旗帜特有，最长冷却时间
    depositCooldown?: number
    // 公路房旗帜特有，抵达目标需要的时间
    travelTime?: number
    // 公路房旗帜特有，travelTime 是否已经计算完成
    travelComplete?: boolean
    // 该旗帜下标注的资源 id
    sourceId?: Id<StructureWithStore | Deposit | StructurePowerBank | Ruin>

    // 当前 powerbank 采集的状态
    state?: string

    // 因为外矿房间有可能没视野
    // 所以把房间名缓存进内存
    roomName?: string

    /**
     * 路径点旗帜中生效
     * 用于指定下一个路径点的旗帜名
     */
    next: string
}

type CenterStructures = STRUCTURE_STORAGE | STRUCTURE_TERMINAL | STRUCTURE_FACTORY | 'centerLink'

/**
 * 房间中央物流 - 资源转移任务
 */
interface ITransferTask {
    // 任务提交者类型
    // number 类型是为了运行玩家自己推送中央任务
    submit: CenterStructures | number
    // 资源的提供建筑类型
    source: CenterStructures
    // 资源的接受建筑类型
    target: CenterStructures
    // 资源类型
    resourceType:  ResourceConstant
    // 资源数量
    amount: number
}

/**
 * creep 的配置项列表
 */
interface ICreepConfigs {
    [creepName: string]: ICreepConfig
}

/**
 * bodySet
 * 简写版本的 bodyPart[]
 * 形式如下
 * @example { [TOUGH]: 3, [WORK]: 4, [MOVE]: 7 }
 */
interface BodySet {
    [MOVE]?: number
    [CARRY]?: number
    [ATTACK]?: number
    [RANGED_ATTACK]?: number
    [WORK]?: number
    [CLAIM]?: number
    [TOUGH]?: number
    [HEAL]?: number
}

// Link 拓展
interface StructureLink {
    work(): void
    asCenter(): string
    asSource(): string
    asUpgrade(): string
}

// ob 拓展
interface StructureObserver {
    updateFlagList(): OK | ERR_NOT_FOUND
}

/**
 * 从路径名到颜色的映射表
 */
interface IPathMap {
    [propName: string]: string
}

/**
 * 单个角色类型的身体部件配置
 * 其键代表房间的 energyAvailable 属性
 * 300 就代表房间能量为 0 ~ 300 时应该使用的身体部件，该区间前开后闭
 * 例如：房间的 energyAvailable 为 600，则就会去使用 800 的身体部件，
 */
type BodyConfig = {
    [energyLevel in 300 | 550 | 800 | 1300 | 1800 | 2300 | 5600 | 10000 ]: BodyPartConstant[]
}

/**
 * 基地布局信息
 */
type BaseLayout = {
    // 该类型建筑应该被放置在什么地方
    [structureType in StructureConstant]?: [ number, number ][] | null
}[]

/**
 * 身体配置项类别
 * 包含了所有角色类型的身体配置
 */
type BodyConfigs = {
    [type in BodyAutoConfigConstant]: BodyConfig
}

interface StructureTerminal {
    addTask(resourceType: ResourceConstant, amount: number, mod?: TerminalModes, channel?: TerminalChannels, priceLimit?: number): void
    add(resourceType: ResourceConstant, amount: number, mod?: TerminalModes, channel?: TerminalChannels, priceLimit?: number): string
    removeByType(type: ResourceConstant, mod: TerminalModes, channel: TerminalChannels): void
    remove(index: number): string
    show(): string
}

/**
 * 终端监听规则类型
 * 具体值详见 ./setting.ts > terminalModes
 */
type ModeGet = 0
type ModePut = 1
type TerminalModes = ModeGet | ModePut

/**
 * 终端监听规则的资源渠道
 * 具体值详见 ./setting.ts > terminalChannels
 */
type ChannelTake = 0
type ChannelRelease = 1
type ChannelShare = 2
type ChannelSupport = 3
type TerminalChannels = ChannelTake | ChannelRelease | ChannelShare | ChannelSupport

// 终端监听任务，详见 doc/终端设计案
interface TerminalListenerTask {
    // 要监听的资源类型
    type: ResourceConstant
    // 期望数量 
    amount: number
    // 监听类型
    mod: TerminalModes
    // 渠道: market, share
    channel: TerminalChannels
    // 价格限制
    priceLimit?: number
    // 要支援的房间名
    supportRoomName?: string
}

// 反应底物表接口
interface IReactionSource {
    [targetResourceName: string]: string[]
}

/**
 * 强化配置项
 * 详情 doc/boost 强化案
 */
interface IBoostConfig {
    [resourceType: string]: number
}

/**
 * PowerCreep 内存拓展
 */
interface PowerCreepMemory {
    /**
     * 移动缓存
     */
    _go?: MoveInfo

    // 等同于 Creep.memory.fromShard
    fromShard?: ShardName

    // pc 暂时没有角色
    role: undefined
    // 为 true 时执行 target，否则执行 source
    working: boolean
    // 接下来要检查哪个 power
    powerIndex: number
    // 当前要处理的工作
    // 字段值均为 PWR_* 常量
    // 在该字段不存在时将默认执行 PWR_GENERATE_OPS（如果 power 资源足够并且 ops 不足时）
    task: PowerConstant
    // 工作的房间名，在第一次出生时由玩家指定，后面会根据该值自动出生到指定房间
    workRoom: string

    /**
     * 同 creep.memory.stand
     */
    stand: boolean

    /**
     * 同 creep.memory.disableCross
     */
    disableCross?: boolean

    // 要添加 REGEN_SOURCE 的 souce 在 room.sources 中的索引值
    sourceIndex?: number
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
interface IPowerTaskConfigs {
    [powerType: string]: IPowerTaskConfig
}

/**
 * 工厂 1-5 级能生产的顶级商品
 */
interface ITopTargetConfig {
    1: CommodityConstant[]
    2: CommodityConstant[]
    3: CommodityConstant[]
    4: CommodityConstant[]
    5: CommodityConstant[]
}

/**
 * boost 任务阶段
 * 仅在房间的 LAB_STATE 为 boost 时有效
 * 
 * @type boostGet 获取资源, boost 进程的默认阶段
 * @type labGetEnergy 获取能量, 有 lab 能量不足时触发
 * @type waitBoost 等待强化，lab 在该阶段会一直等待直到 creep 调用强化
 * @type boostClear 清除资源，在强化完成后打扫 lab
 */
type BoostStats = 'boostGet' | 'labGetEnergy' | 'waitBoost' | 'boostClear'

/**
 * boost 资源配置类型
 * 
 * @type WAR 对外战争
 * @type DEFENSE 主动防御
 */
type BoostType = 'WAR' | 'DEFENSE'

/**
 * boost 资源配置表
 * 规定了不同模式下需要往 lab 装填的资源类型
 */
type BoostResourceConfig = {
    [type in BoostType]: ResourceConstant[]
}

/**
 * 强化任务
 * 存放了房间进行 boost 所需的数据
 */
interface BoostTask {
    // 当前任务的所处状态
    state: BoostStats
    // 进行 boost 强化的位置
    pos: number[]
    // 要进行强化的材料以及执行强化的 lab
    lab: {
        [resourceType: string]: Id<StructureLab>
    }
    // 本次强化任务所用的类型
    type: BoostType
}

// 战斗小队的基础信息
interface SquadBase<IN_MEMORY extends boolean> {
    // 是否准备就绪
    ready: boolean
    // 小队路径
    path: string
    // 小队前进方向
    direction: DirectionConstant
    // 目标建筑
    targetStructures: IN_MEMORY extends true ? Id<Structure>[] : Structure[]
    // 目标 creep
    targetCreep: IN_MEMORY extends true ? Id<Creep | PowerCreep>[] : (Creep | PowerCreep)[]
}

// 小队内存
type SquadMemory = SquadBase<true>

/**
 * 小队中允许执行的战术动作
 * @type back 掉头，后队变前队
 * @type left 左转（逆时针）
 * @type right 右转（顺时针）
 * @type cross 对穿（左上到右下，右上到左下） 
 */
type SquadTacticalActions = 'back' | 'left' | 'right' | 'cross'

// 小队类型，要新增其他种类小队就在后面追加类型
type SquadTypes = Apocalypse4 /** | ... */

// 四个一体机
type Apocalypse4 = 'apocalypse4'

// 小队的具体配置
interface SquadStrategy {
    // 小队的组成，键为角色，值为需要的数量
    member: {
        [role in CreepRoleConstant]?: number
    }

    // 小队指令 - 治疗
    heal: (squad: SquadMember, memory: SquadMemory) => any
    // 小队指令 - 攻击敌方单位
    attackCreep: (squad: SquadMember, memory: SquadMemory) => any
    // 小队指令 - 攻击敌方建筑
    attackStructure: (squad: SquadMember, memory: SquadMemory) => any
    // 寻路回调，在小队 getPath 中 PathFinder 的 roomCallback 中调用，用于添加小队自定义 cost
    findPathCallback?: (roomName: string, costs: CostMatrix) => CostMatrix
    // 决定移动策略，参数是三个小队指令的返回值，返回是否继续前进（为 false 则后撤）
    getMoveStrategy?: (healResult: any, attackCreepResult: any, attackStructureResult: any) => boolean
}

// 小队成员对象，键为小队成员在小队内存中的键，值为其本人，常用作参数
interface SquadMember {
    [memberName: string]: Creep
}

/**
 * ------------------------ 以下的是用于创建 HTML Element 时使用的声明 -----------------------------------
 */

// HTML 元素基类
interface ElementDetail {
    // 该元素的 name 属性
    name: string
    // 该元素的前缀（用于 form 中）
    label?: string
    // 每个基础元素都要有这个字段来标志自己描述的那个元素
    type: string
}

type HTMLElementDetail = InputDetail | SelectDetail

// 输入框
interface InputDetail extends ElementDetail {
    // 提示内容
    placeholder?: string
    type: 'input'
}

// 下拉框
interface SelectDetail extends ElementDetail {
    // 选项
    options: {
        // 选项值
        value: string | number
        // 选项显示内容
        label: string
    }[]
    type: 'select'
}

// 按钮
interface ButtonDetail {
    // 按钮显示文本
    content: string
    // 按钮会执行的命令（可以访问游戏对象）
    command: string
}

/**
 * creep 发布计划职责链上的一个节点
 * 
 * @param detail 该 creep 发布所需的房间信息
 * @returns 代表该发布计划是否适合房间状态
 */
type PlanNodeFunction = (detail: UpgraderPlanStats | HarvesterPlanStats | TransporterPlanStats) => boolean

// 房间中用于发布 upgrader 所需要的信息
interface UpgraderPlanStats {
    // 房间对象
    room: Room
    // 房间内的控制器等级
    controllerLevel: number
    // 控制器还有多久降级
    ticksToDowngrade: number
    // source 建造好的 container 的 id
    sourceContainerIds: Id<StructureContainer>[]
    // 房间内 storage 的 id，房间没 storage 时该值为空，下同
    storageId?: Id<StructureStorage>
    // 房间内 terminal 的 id，房间没 terminal 时该值为空，下同
    terminalId?: Id<StructureTerminal>
    // 房间内 upgradeLink 的 id
    upgradeLinkId?: Id<StructureLink>
    // storage 中有多少能量
    storageEnergy?: number
    // terminal 中有多少能量
    terminalEnergy?: number
}

// 房间中用于发布 harvester 所需要的信息
interface HarvesterPlanStats {
    // 房间对象
    room: Room
    // 房间内 source 的 id 和其配套的 link id
    sources: {
        id: Id<Source>
        linkId: Id<StructureLink>
    }[]
    // 房间内 storage 的 id，房间没 storage 时该值为空，下同
    storageId?: Id<StructureStorage>
    // 房间内中央 link 的 id
    centerLinkId?: Id<StructureLink>
}

// 房间中用于发布 filler manager processor 所需要的信息
interface TransporterPlanStats {
    // 房间对象
    room: Room
    // 房间内 storage 的 id，房间没 storage 时该值为空，下同
    storageId?: Id<StructureStorage>
    // 房间内中央 link 的 id
    centerLinkId?: Id<StructureLink>
    // source 建造好的 container 的 id
    sourceContainerIds?: Id<StructureContainer>[]
    // 基地中心点（processor的位置）坐标
    centerPos?: [ number, number ]
}

// 发布角色配置项需要的素材集合
interface ReleasePlanConstructor<T> {
    // 搜集发布该角色需要的房间信息
    getStats: (room: Room) => T
    // 发布计划的集合，会根据收集到的房间信息选择具体的计划
    plans: PlanNodeFunction[]
}

// 所有使用发布计划的角色
interface CreepReleasePlans {
    harvester: ReleasePlanConstructor<HarvesterPlanStats>
    upgrader: ReleasePlanConstructor<UpgraderPlanStats>
    transporter: ReleasePlanConstructor<TransporterPlanStats>
}

/**
 * 交易的合理范围
 * 将以昨日该资源的交易范围为基准，上(MAX)下(MIN)浮动出一个区间，超过该区间的订单将被不会交易
 * 如果没有特别指定的话将以 default 指定的区间为基准
 */
type DealRatios = {
    [resType in ResourceConstant | 'default']?: {
        // 卖单的最高价格
        MAX: number,
        // 买单的最低价格
        MIN: number
    }
}

// 目前官服存在的所有 shard 的名字
type ShardName = 'shard0' | 'shard1' | 'shard2' | 'shard3'

// 跨 shard 请求构造器
interface CrossShardRequestConstructor<RequestType, RequestData> {
    // 要处理请求的 shard
    to: ShardName,
    // 该请求的类型
    type: RequestType,
    // 该请求携带的数据
    data: RequestData
}

/**
 * 跨 shard 请求 - 发送 creep
 */
type SendCreep = 'sendCreep'
type SendCreepData = {
    // 要发送 creep 的名字
    name: string
    // 要发送 creep 的内存
    memory: CreepMemory
}

/**
 * 跨 shard 请求 - 提交重新孵化任务
 */
type SendRespawn = 'sendRespawn'
type SendRespawnData = {
    // 要重新孵化的 creep 的名字
    name: string
    // 要重新孵化的 creep 的内存
    memory: CreepMemory | PowerCreepMemory
}

// 构造所有的跨 shard 请求
type CrossShardRequest = 
    CrossShardRequestConstructor<SendCreep, SendCreepData> |
    CrossShardRequestConstructor<SendRespawn, SendRespawnData>

// 所有跨 shard 请求的类型和数据
type CrossShardRequestType = SendCreep | SendRespawn
type CrossShardRequestData = SendCreepData | SendRespawnData

// 所有跨 shard 请求的执行策略
type CrossShardRequestStrategies = {
    [type in CrossShardRequestType]: (data: CrossShardRequestData) => ScreepsReturnCode
}

// 镜面的跨 shard 数据
type InterShardData = {
    [shard in ShardName]?: {
        // 一个键值对构成了一个消息
        [msgName: string]: CrossShardRequest | ScreepsReturnCode   
    }
}

// 跨 shard 响应
interface CrossShardReply {
    // 响应是否存在
    has: boolean,
    // 响应的状态
    result?: ScreepsReturnCode
}

// 跨 shard 请求的元数据
interface CrossShardRequestInfo {
    // 请求的发送 shard
    source: ShardName,
    // 请求的名称
    name: string
}

/**
 * 要建造工地的位置
 */
interface ConstructionPos<StructureType extends BuildableStructureConstant = BuildableStructureConstant> {
    // 要建造到的位置
    pos: RoomPosition,
    // 要建造的建筑类型
    type: StructureType
}

/**
 * 建筑规划结果
 * 
 * 每种建筑（键）都对应一个建筑位置二维数组（值）
 * 后面的二维数组第一层代表 RCL 等级，第二层包含了该 RCL 时应该建造的位置信息
 */
type StructurePlanningResult = {
    // 该类型建筑应该被放置在什么地方
    [structureType in BuildableStructureConstant]?: RoomPosition[] | null
}[]

/**
 * 全局建筑规划缓存
 * 键为房间名，值为对应的规划结果
 */
interface StructurePlanningCache {
    [roomName: string]: StructurePlanningResult
}

/**
 * 目前存在的所有有效 RCL 等级
 */
type AvailableLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

/**
 * 自定义移动的选项
 */
interface MoveOpt {
    /**
     * 重用距离，等同于 moveTo 的 reusePath
     */
    reusePath?: number,

    /**
     * 要移动到目标位置的距离
     */
    range?: number,

    /**
     * 是否禁用对穿（为 true 则会躲避 creep，默认为 false）
     */
    disableCross?: boolean,

    /**
     * 移动目标所在的 shard（不填则默认为本 shard）
     */
    shard?: ShardName,

    /**
     * 路径点
     * 传入形如 [ '12 21 E1N1', '12 21 E2N2' ] 的路径点数组
     * 或是任意路径旗帜名前缀
     */
    wayPoint?: string[] | string,

    /**
     * 最大的搜索成本
     */
    maxOps?: number,

    /**
     * 是否检查目标发生了变化，为 true 的话会每 tick 检查目标位置是否变化
     * 一旦变化则会立刻重新规划
     */
    checkTarget?: boolean


    /**
     * 是否禁用路径缓存
     * 当 creep 因为对方拒绝对穿而重新寻路时，就需要开启该选项
     * 否则如果恰好有缓存的路径经过了拒绝对穿者，那该 creep 就会由于使用了该缓存从而不停的撞击拒绝对穿的单位
     */
    disableRouteCache?: boolean
}

/**
 * 移动的内存数据
 */
interface MoveInfo {
    /**
     * 序列化之后的路径信息
     */
    path?: string

    /**
     * 上一个位置信息，形如"14/4"，用于在 creep.move 返回 OK 时检查有没有撞停
     */
    prePos?: string

    /**
     * 上一次移动的方向，用于在下个 tick 发现移动失败时检查前面时什么东西
     * 同时也代表这个 creep 正处在移动之中（移动到目的地后会将该字段删除）
     */
    lastMove?: DirectionConstant

    /**
     * 要移动到的目标位置，creep 会用这个字段判断目标是否变化了
     */
    targetPos?: string

    /**
     * 数组形式传入的路径点
     */
    wayPoints?: string[]

    /**
     * 路径旗帜名（包含后面的编号，如 waypoint1 或者 waypoint99）
     */
    wayPointFlag?: string
}

/**
 * 是否允许对穿
 * 
 * @param creep 被对穿的 creep
 * @param requireCreep 发起对穿的 creep
 * @return 为 true 时允许对穿
 */
type AllowCrossRuleFunc = (creep: Creep | PowerCreep, requireCreep: Creep | PowerCreep) => boolean

/**
 * 对穿请求的规则集合
 * 
 * 键为 creep 的角色类型，值为一个返回 boolean 的方法
 * 该方法用于判断有其他 creep 向该 creep 发起对穿时是否同意对穿，在寻路时也会使用该方法确定是否要绕过一个 creep
 * 该方法为空则使用默认规则（键为 default）
 */
type CrossRules = {
    [role in CreepRoleConstant | 'default']?: AllowCrossRuleFunc
}

/**
 * 所有被添加到 Room 上的快捷访问键
 */
type AllRoomShortcut = STRUCTURE_OBSERVER | STRUCTURE_POWER_SPAWN | STRUCTURE_EXTRACTOR | 
    STRUCTURE_NUKER | STRUCTURE_FACTORY | STRUCTURE_SPAWN | STRUCTURE_EXTENSION | STRUCTURE_ROAD | 
    STRUCTURE_WALL | STRUCTURE_RAMPART | STRUCTURE_KEEPER_LAIR | STRUCTURE_PORTAL | STRUCTURE_LINK | 
    STRUCTURE_TOWER | STRUCTURE_LAB | STRUCTURE_CONTAINER | 'mineral' | 'source'
/**
 * 房间快捷访问的 id 缓存
 */
type StructureIdCache = {
    /**
     * 每个房间的建筑 id 合集
     */
    [roomName: string]: {
        /**
         * 每个建筑类型对应的 id 数组
         * 这里不考虑建筑是单个还是多个，统一都是数组
         */
        [T in AllRoomShortcut]?: Id<RoomObject>[]
    }
}

type AnyObject = { [key: string]: any }

/**
 * 延迟任务的数据
 */
interface DelayTaskData {
    /**
     * 必须为延迟任务分配一个房间名
     * 执行回调时会自动将其转换为房间对象
     */
    roomName: string
}

/**
 * 所有延迟任务的名称和数据的对应 map
 */
interface DelayTaskTypes {
    /**
     * 维修工延迟孵化
     */
    repairer: DelayTaskData
}

/**
 * 所有延迟任务的名字
 */
type AllDelayTaskName = keyof DelayTaskTypes

/**
 * 延迟任务的回调
 * 
 * @param data 任务的数据
 * @param room 该任务对应的房间对象，由数据中的 roomName 获取
 */
type DelayTaskCallback = <K extends AllDelayTaskName>(data: DelayTaskTypes[K], room: Room | undefined) => void

/**
 * 添加延迟任务
 */
type AddDelayTask = <K extends AllDelayTaskName>(name: K, data: DelayTaskTypes[K], callTime: number) => void

/**
 * 添加延迟任务回调
 */
type AddDelayCallback = <K extends AllDelayTaskName>(name: K, callback: DelayTaskCallback) => void