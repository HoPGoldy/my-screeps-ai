// 当 creep 不需要生成时 mySpawnCreep 返回的值
type CREEP_DONT_NEED_SPAWN = -101
// spawn.mySpawnCreep 方法的返回值集合
type MySpawnReturnCode = ScreepsReturnCode | CREEP_DONT_NEED_SPAWN

// 本项目中出现的颜色常量
type Colors = 'green' | 'blue' | 'yellow' | 'red'

// 终端监听规则类型
type TerminalListenerModes = 'sell' | 'buy'
// 终端监听规则的资源来源
type SupplementActions = 'release' | 'take' | 'share'

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
        // 全局的路径缓存
        // Creep 在执行远程寻路时会优先检查该缓存
        routeCache: {
            // 键为路径的起点和终点名，例如："12/32/W1N1 23/12/W2N2"，值是使用 Creep.serializeFarPath 序列化后的路径
            [routeKey: string]: string
        }
    }
}

/**
 * Game 对象拓展
 */
interface Game {
    // 本 tick 是否已经执行了 creep 数量控制器了
    // 每 tick 只会调用一次
    _hasRunCreepNumberController: boolean
}

// 所有的 creep 角色
type CreepRoleConstant = BaseRoleConstant | AdvancedRoleConstant | RemoteRoleConstant | WarRoleConstant

// 房间基础运营
type BaseRoleConstant = 
    'harvester' |
    'collector' |
    'miner' |
    'upgrader' |
    'builder' |
    'repairer'

// 房间高级运营
type AdvancedRoleConstant = 
    'transfer' |
    'centerTransfer'

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
    'pbTransfer' |
    'moveTester' |
    'reiver'

// 战斗单位
type WarRoleConstant =
    'soldier' |
    'doctor' |
    'boostDoctor' |
    'dismantler' |
    'boostDismantler' |
    'apocalypse'

/**
 * creep 工作逻辑集合
 * 包含了每个角色应该做的工作
 */
type CreepWork = {
    [role in CreepRoleConstant]: (data: CreepData) => ICreepConfig
}

interface ICreepConfig {
    // 每次死后都会进行判断，只有返回 true 时才会重新发布孵化任务
    isNeed?: (room: Room) => boolean
    // 准备阶段执行的方法, 返回 true 时代表准备完成
    prepare?: (creep: Creep) => boolean
    // creep 获取工作所需资源时执行的方法
    // 返回 true 则执行 target 阶段，返回其他将继续执行该方法
    source?: (creep: Creep) => boolean
    // creep 工作时执行的方法,
    // 返回 true 则执行 source 阶段，返回其他将继续执行该方法
    target: (creep: Creep) => boolean
    // 每个角色默认的身体组成部分
    bodys: BodyAutoConfigConstant | BodyPartConstant[]
}

/**
 * 所有 creep 角色的 data
 */
type CreepData = 
    ReiverData |
    HarvesterData | 
    WorkerData | 
    CenterTransferData | 
    RemoteHelperData | 
    RemoteDeclarerData |
    RemoteHarvesterData |
    pbAttackerData |
    WarUnitData |
    ApocalypseData |
    HealUnitData

/**
 * 采集单位的 data
 * 执行从 sourceId 处采集东西，并转移至 targetId 处（不一定使用，每个角色都有自己固定的目标例如 storage 或者 terminal）
 */
interface HarvesterData {
    // 要采集的 source id
    sourceId: string
    // 把采集到的资源存到哪里存在哪里
    targetId: string
}

/**
 * 工作单位的 data
 * 由于由确定的工作目标所以不需要 targetId
 */
interface WorkerData {
    // 要使用的资源存放建筑 id
    sourceId: string
}

/**
 * 中央运输者的 data 
 * x y 为其在房间中的固定位置
 */
interface CenterTransferData {
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
    sourceId: string
}

/**
 * 掠夺者单位的 ddata
 */
interface ReiverData {
    // 目标建筑上的旗帜名称
    flagName: string
    // 要搬运到的建筑 id
    targetId: string
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
    targetId?: string
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
    // 待命位置旗帜名
    // standByFlagName: string/
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
    'worker' |
    'upgrader' |
    'transfer' |
    'centerTransfer' |
    'reserver' |
    'attacker' |
    'healer' |
    'remoteDefender' |
    'dismantler' |
    'remoteHarvester'

/**
 * 建筑拓展
 */
interface Structure {
    // 建筑的工作方法
    work?(): void
    // 建筑在完成建造时触发的回调
    onBuildComplete?(): void
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

/**
 * Creep 拓展
 * 来自于 mount.creep.ts
 */
interface Creep {
    _id: string
    _move(direction: DirectionConstant | Creep): CreepMoveReturnCode | ERR_NOT_IN_RANGE | ERR_INVALID_TARGET
    work(): void
    checkEnemy(): boolean
    standBy(): void
    defense(): void
    farMoveTo(target: RoomPosition, range?: number): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_IN_RANGE
    goTo(target: RoomPosition, range?: number): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND
    requireCross(direction: DirectionConstant): Boolean
    mutualCross(direction: DirectionConstant): OK | ERR_BUSY | ERR_NOT_FOUND
    upgrade(): boolean
    buildStructure(): CreepActionReturnCode | ERR_NOT_ENOUGH_RESOURCES | ERR_RCL_NOT_ENOUGH | ERR_NOT_FOUND
    fillDefenseStructure(expectHits?: number): boolean
    getEngryFrom(target: Structure|Source): ScreepsReturnCode
    transferTo(target: Structure, RESOURCE: ResourceConstant): ScreepsReturnCode
    attackFlag(flagName: string): boolean
    rangedAttackFlag(flagName: string): boolean
    smass(): void
    dismantleFlag(flagName: string): boolean
    healTo(creep: Creep): void
    getFlag(flagName: string): Flag|null
    getAmount(resourceType: ResourceConstant, source: StructureWithStore, target: StructureWithStore): number
}

/**
 * Creep 拓展
 * 来自于 mount.powerCreep.ts
 */
interface PowerCreep {
    _move(direction: DirectionConstant | Creep): CreepMoveReturnCode | ERR_NOT_IN_RANGE | ERR_INVALID_TARGET
    goTo(target: RoomPosition, range?: number): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND
    requireCross(direction: DirectionConstant): Boolean
    enablePower(): OK | ERR_BUSY
    getOps(opsNumber: number): OK | ERR_NOT_ENOUGH_RESOURCES | ERR_BUSY
}

/**
 * 包含 store 属性的建筑
 */
type StructureWithStore = StructureStorage | StructureContainer | StructureExtension | StructureFactory | StructureSpawn | StructurePowerSpawn | StructureLink | StructureTerminal | StructureNuker

/**
 * creep 内存拓展
 */
interface CreepMemory {
    // 内置移动缓存
    _move?: Object
    // creep 是否已经准备好可以工作了
    ready: boolean
    // creep 的角色
    role: CreepRoleConstant
    // 是否在工作
    working: boolean
    // creep 在工作时需要的自定义配置，在孵化时由 spawn 复制
    data?: CreepData
    // 该 Creep 是否在站着不动进行工作
    // 该字段用于减少 creep 向 Room.restrictedPos 里添加自己位置的次数
    standed?: boolean
    // 外矿采集者特有 要采集的 Source Id
    sourceId?: string
    // 远程寻路缓存
    farMove?: {
        // 序列化之后的路径信息
        path?: string
        // 移动索引，标志 creep 现在走到的第几个位置
        index?: number
        // 上一个位置信息，形如"14/4"，用于在 creep.move 返回 OK 时检查有没有撞墙
        prePos?: string
        // 缓存路径的目标，该目标发生变化时刷新路径, 形如"14/4E14S1"
        targetPos?: string
    }
    // 上一个位置信息，形如"14/4"，用于在 creep.move 返回 OK 时检查有没有撞墙
    prePos?: string
    // deposit 采集者特有，deposit 的类型
    depositType?: DepositConstant
    // 要填充的墙 id 
    fillWallId?: string
    // transfer 特有 要填充能量的建筑 id
    fillStructureId?: string
    // 建筑工特有，当前缓存的建筑工地（目前只有外矿采集者在用）
    constructionSiteId?: string
    // 外矿采集者特有, 该字段为 true 时, 每 tick 都会尝试检查工地并建造
    dontBuild?: boolean
    // transfer 特有，当前任务正在转移的资源类型
    taskResource?: ResourceConstant
    // 城墙填充特有，当前期望的城墙生命值
    expectHits?: number
    // 攻击者的小队编号 暂时未使用
    squad?: number
    // 是否已经在待命位置, 此状态为 true 时，防御者的standBy方法将不会在调用 pos.isEqualTo()
    isStanBy?: boolean
    // collector 上次发送 regen_source 的时间，该时间小于 300t 将不会重复发布 power 任务
    sendRegenSource?: number

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
    // 已拥有的房间特有，tower 负责维护
    _enemys: Creep[]
    // 需要维修的建筑，tower 负责维护，为 1 说明建筑均良好
    _damagedStructure: AnyStructure | 1
    // 该 tick 是否已经有 tower 刷过墙了
    _hasFillWall: boolean
    // 外矿房间特有，外矿单位维护
    // 一旦该字段为 true 就告诉出生点暂时禁止自己重生直到 1500 tick 之后
    _hasEnemy: boolean
    // 当该字段为 true 时, repairer 角色将专心给 tower 填充
    // 由房间中的 tower 负责更新
    _towerShoulderRepair: boolean
    // 该房间是否已经执行过 lab 集群作业了
    // 在 Lab.work 中调用，一个房间只会执行一次
    _hasRunLab: boolean
    // 该房间是否已经运行过工地作业了
    _hasRunConstructionSite: boolean

    // 房间基础服务
    factory?: StructureFactory
    powerSpawn: StructurePowerSpawn
    nuker: StructureNuker
    observer: StructureObserver
    centerLink: StructureLink
    mineral: Mineral
    sources: Source[]

    // pos 处理 api
    serializePos(pos: RoomPosition): string
    unserializePos(posStr: string): RoomPosition | undefined

    // power 任务 api
    addPowerTask(task: PowerConstant, priority?: number): OK | ERR_NAME_EXISTS | ERR_INVALID_TARGET
    deleteCurrentPowerTask(): void
    getPowerTask(): PowerConstant | undefined
    hangPowerTask(): void

    // creep 发布 api
    planCreep(): string
    addCenterTransfer(): string
    addRemoteCreepGroup(remoteRoomName: string)
    addRemoteReserver(remoteRoomName): void
    addRemoteHelper(remoteRoomName): void
    removePbHarvesteGroup(attackerName: string, healerName: string): void
    spawnPbTransferGroup(flagName: string, number: number): void
    addUpgradeGroup(creepNum?: number): OK | ERR_NOT_FOUND
    removeUpgradeGroup(creepNum?: number): void

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
    handleRoomTransferTask(): void
    deleteCurrentRoomTransferTask(): void

    // 工厂 api
    setFactoryTarget(resourceType: ResourceConstant): string
    getFactoryTarget(): ResourceConstant | null
    clearFactoryTarget(): string

    // 资源共享 api
    shareRequest(resourceType: ResourceConstant, amount: number): boolean
    shareAddSource(resourceType: ResourceConstant): boolean
    shareRemoveSource(resourceType: ResourceConstant): void
    shareAdd(targetRoom: string, resourceType: ResourceConstant, amount: number): boolean

    // boost api
    boost(boostType: string, boostConfig: IBoostConfig): OK | ERR_NAME_EXISTS | ERR_NOT_FOUND | ERR_INVALID_ARGS | ERR_NOT_ENOUGH_RESOURCES
    boostCreep(creep: Creep): OK | ERR_NOT_FOUND | ERR_BUSY | ERR_NOT_IN_RANGE

    // 禁止通行点位 api
    addRestrictedPos(creepName: string, pos: RoomPosition): void
    getRestrictedPos(): { [creepName: string]: string }
    removeRestrictedPos(creepName: string): void
}

interface RoomPosition {
    directionToPos(direction: DirectionConstant): RoomPosition | undefined
    getFreeSpace(): number
}

type ObserverResource = 'powerBank' | 'deposit'

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
    // 该房间的生产队列，元素为 creepConfig 的键名
    spawnList?: string[]
    // 该房间禁止通行点的存储
    // 键为注册禁止通行点位的 creep 名称，值为禁止通行点位 RoomPosition 对象的序列字符串
    restrictedPos?: {
        [creepName: string]: string
    }

    // tower 发现的敌人 id
    targetHostileId: string

    // observer 内存
    observer: {
        // 上个 tick 已经 ob 过的房间名
        checkRoomName?: string
        // 遍历 watchRooms 所使用的索引
        watchIndex: number
        // 监听的房间列表
        watchRooms: string[]
        // 当前已经找到的 powerBank 和 deposit 的数量，observer 找到后会增加该数值，采集 creep 采集完之后会减少该数值
        pbNumber: number
        depositNumber: number
        // 和上面两个对应，分别是 powerBank 和 deposit 的查找上限，由玩家通过 api 指定。两者默认值均为 1
        pbMax: number
        depositMax: number
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
    constructionSiteId: string
    // 建筑工特有，当前正在修建的建筑类型，用于在修建完成后触发对应的事件
    constructionSiteType?: StructureConstant
    // 建筑工地的坐标，用于在建造完成后进行 lookFor 来确认其是否成功修建了建筑
    constructionSitePos: number[]
    
    // 房间内工厂生产的目标
    factoryTarget: ResourceConstant
    factory: {
        // 当前房间的等级，由用户指定
        level?: number
        // 下个顶级产物索引
        targetIndex: number
        // 本工厂参与的生产线类型
        depositType?: DepositConstant
        // 当前正在制作的顶级产品
        topTarget?: CommodityConstant
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
    // 键为资源名称，值为资源期望数量
    terminalTasks: {
        [resourceType: string]: TerminalListenerTask
    }
    // 本房间持有的订单，键为订单资源，值为订单 id
    holdOrders?: {
        [res in MarketResourceConstant]: string
    }
    // 房间内终端缓存的订单id
    targetOrderId: string
    // 当前终端要监听的资源索引
    terminalIndex: number
    
    // 房间内的资源和建筑 id
    mineralId: string
    factoryId: string
    extractorId: string
    powerSpawnId: string
    nukerId: string
    observerId: string
    sourceIds: string[]
    
    // Link 的专用内存字段
    links?: {
        // 使用 link id 来标注其角色
        [linkId: string]: string
    }
    // 中央 link 的 id，source Link 会通过这个字段进行查找
    centerLinkId?: string
    // 升级 link 的 id，source / center Link 会通过这个字段进行查找
    upgradeLinkId?: string

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
            targetId: string
        }
    }

    // 当前被 repairer 或 tower 关注的墙
    focusWall: {
        id: string
        endTime: number
    }

    // 该房间要执行的资源共享任务
    shareTask: IRoomShareTask

    /**
     * lab 集群所需的信息
     * @see doc/lab设计案
     */
    lab?: {
        // 当前集群的工作状态
        state: string
        // 当前生产的目标产物索引
        targetIndex: number
        // 当前要生产的数量
        targetAmount?: number
        // 底物存放 lab 的 id
        inLab: string[]
        // 产物存放 lab 的 id
        outLab: {
            [labId: string]: number
        }
        // 反应进行后下次反应进行的时间，值为 Game.time + cooldown
        reactionRunTime?: number
        // lab 是否暂停运行
        pause: boolean
    }

    /**
     * 战争状态
     */
    war?: {

    }

    /**
     * boost 强化任务
     * @see doc/boost设计案
     */
    boost?: {
        // 当前任务的所处状态
        state: string
        // 进行 boost 强化的位置
        pos: number[]
        // 要进行强化的材料以及执行强化的 lab
        lab: {
            [resourceType: string]: string
        }
    }

    // powerSpawn 内存
    powerSpawn: {
        // 是否暂停处理
        pause?: boolean
    }
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
    id: string
}

// 房间物流任务 - 填充核弹
interface IFillNuker {
    type: string
    id: string
    resourceType: ResourceConstant
}

// 房间物流任务 - 填充 PowerSpawn
interface IFillPowerSpawn {
    type: string
    id: string
    resourceType: ResourceConstant
}

// 房间物流任务 - lab 底物填充
interface ILabIn {
    type: string
    resource: {
        id: string
        type: ResourceConstant
        amount: number
    }[]
}

// 房间物流任务 - lab 产物移出
interface ILabOut {
    type: string
    resourceType: ResourceConstant
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
    source: (creep: Creep, task: RoomTransferTasks, sourceId: string) => boolean
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
        // 不同的生产线有不同的配置项
        [depositType: string]: {
            // 生成线中的所有参与房间
            // 以下键为等级，值为房间名称数组
            node: {
                1: string[]
                2: string[]
                3: string[]
                4: string[]
                5: string[]
            }
        }
    }
    // 所有 creep 的配置项，每次 creep 死亡或者新增时都会通过这个表来完成初始化
    creepConfigs: {
        [creepName: string]: {
            // creep 的角色名
            role: CreepRoleConstant,
            // creep 的具体配置项，每个角色的配置都不相同
            data: CreepData,
            // 执行 creep 孵化的房间名
            spawnRoom: string,
            // creep 孵化时使用的身体部件
            // 为 string 时则自动规划身体部件，为 BodyPartConstant[] 时则强制生成该身体配置
            bodys: BodyAutoConfigConstant | BodyPartConstant[]
        }
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
}

interface FlagMemory {
    // deposit 旗帜特有，最长冷却时间
    depositCooldown?: number
    // 公路房旗帜特有，抵达目标需要的时间
    travelTime?: number
    // 公路房旗帜特有，travelTime 是否已经计算完成
    travelComplete?: boolean
    // 该旗帜下标注的资源 id
    sourceId?: string

    // 当前 powerbank 采集的状态
    state?: string

    // 因为外矿房间有可能没视野
    // 所以把房间名缓存进内存
    roomName?: string
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
    to(targetId: string): void
    asCenter(): string
    asSource(): string
    asUpgrade(): string
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
interface BodyConfig {
    300: BodyPartConstant[]
    550: BodyPartConstant[]
    800: BodyPartConstant[]
    1300: BodyPartConstant[]
    1800: BodyPartConstant[]
    2300: BodyPartConstant[]
    5600: BodyPartConstant[]
    10000: BodyPartConstant[]
}

/**
 * 身体配置项类别
 * 包含了所有角色类型的身体配置
 */
type IBodyConfigs = {
    [type in BodyAutoConfigConstant]: BodyConfig
}

interface StructureTerminal {
    add(resourceType: ResourceConstant, amount: number, mod?: TerminalListenerModes, supplementAction?: SupplementActions, priceLimit?: number): void
    remove(resourceType: ResourceConstant): void
    show(): string
}

// 终端监听任务，详见 doc/终端设计案
interface TerminalListenerTask {
    // 期望数量 
    amount: number
    // 监听类型
    mod: TerminalListenerModes
    // 补充来源: market, share
    supplementAction: SupplementActions
    // 价格限制
    priceLimit?: number
}

// terminal 内部逻辑使用的任务对象
// 之所以比 TerminalListenerTask 多了个 type，是因为 TerminalListenerTask 的资源类型是它的键，详见 RoomMemory
interface TerminalOrderTask extends TerminalListenerTask { 
    // 要监听的资源类型
    type: ResourceConstant
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