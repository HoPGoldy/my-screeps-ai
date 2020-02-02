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

/**
 * 建筑拓展
 * 有可能有自定义的 work 方法
 */
interface Structure {
    work?(): void
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
    _move(direction: DirectionConstant | Creep): CreepMoveReturnCode | ERR_NOT_IN_RANGE | ERR_INVALID_TARGET
    work(): void
    updateState(workingMsg?: string, onStateChange?: Function): boolean
    checkEnemy(): boolean
    standBy(): void
    defense(): void
    farMoveTo(target: RoomPosition, ignoreRoom?: string[], range?: number): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_IN_RANGE
    goTo(target: RoomPosition, range?: number): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND
    requireCross(direction: DirectionConstant): Boolean
    mutualCross(direction: DirectionConstant): OK | ERR_BUSY | ERR_NOT_FOUND
    upgrade(): boolean
    buildStructure(): boolean
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
    // creep是否已经准备好可以工作了
    ready: boolean
    // creep的角色
    role: string
    // 是否在工作
    working: boolean
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
    // 该房间的禁止通行点
    _restrictedPos: Set<string>
    
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

    /**
     * 下述方法在 @see /src/mount.room.ts 中定义
     */
    // 孵化队列 api
    addSpawnTask(taskName: string): number | ERR_NAME_EXISTS
    hasSpawnTask(taskName: string): boolean
    clearSpawnTask(): void
    hangSpawnTask(): void

    // 中央物流 api
    addCenterTask(task: ITransferTask): number
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
    handleBoostGetResourceTask(resourceIndex: number, number: number): void
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
    addRestrictedPos(pos: RoomPosition): void
    getRestrictedPos(): { [posStr: string]: true }
    removeRestrictedPos(pos: RoomPosition): void
}

interface RoomPosition {
    directionToPos(direction: DirectionConstant): RoomPosition | undefined
}

type ObserverResource = 'powerBank' | 'deposit'

/**
 * 房间内存
 */
interface RoomMemory {
    // 该房间的生产队列，元素为 creepConfig 的键名
    spawnList?: string[]
    // 该房间禁止通行点的存储
    restrictedPos?: {
        [posStr: string]: true
    }
    // observer 内存
    observer: {
        // 上个 tick 已经 ob 过的房间名
        checkRoomName?: string
        // 遍历 watchRooms 所使用的索引
        watchIndex: number
        // 监听的房间列表
        watchRooms: string[]
        // 获取到的资源信息
        resourceFlags: {
            powerBank: string[]
            deposit: string[]
        }
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
    // 房间内工厂生产的目标
    factoryTarget: ResourceConstant
    
    // 终端监听矿物列表
    // 键为资源名称，值为资源期望数量
    terminalTasks: {
        [resourceType: string]: {
            amount: number
            mod: string
            supplementAction: string
        }
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

    // 外矿专用内存字段
    remote: {
        // 对应名称的 creep 在指定的 tick 之后才能生成
        // 该属性一般由外矿 creep 在发现有入侵者之后设置
        // spawn 在发现到达指定 tick 后会移除对应的属性
        [creepName: string]: number
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
     * boost 强化任务
     * @see doc/boost设计案
     */
    boost?: {
        // 当前任务的所处状态
        state: string
        // 当前任务的种类
        type: string
        // 进行 boost 强化的位置
        pos: number[]
        // 要进行强化的材料以及执行强化的 lab
        lab: {
            [resourceType: string]: string
        },
        // 进行强化的具体配置项
        config: IBoostConfig
    }
    /**
     * 是否还有 boost 任务在排队
     * 如果为 true 的话则 lab 集群会一直停留在 GetTarget 阶段
     */
    hasMoreBoost: boolean

    // powerSpawn 内存
    powerSpawn: {
        // 是否暂停处理
        pause?: boolean
    }

    /**
     * 房间内的数据统计
     */
    stats: {
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
    resource: {
        type: ResourceConstant
        labId: string
        number: number
    }[]
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
    target: (creep: Creep, task: RoomTransferTasks) => any
    // creep 非工作(收集资源时)执行的方法
    source: (creep: Creep, task: RoomTransferTasks, sourceId: string) => any
    // 更新状态时触发的方法
    switch: (creep: Creep, task: RoomTransferTasks) => boolean
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
    // 资源来源表
    resourceSourceMap: {
        // 资源类型为键，房间名列表为值
        [resourceType: string]: string[]
    },
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
 * creep 的角色配置项
 */
interface ICreepConfig {
    //在孵化前进行的判断，只有返回 true 时才会进行生成
    isNeed?: (room: Room) => boolean
    // 准备阶段执行的方法, 返回 true 时代表准备完成
    prepare?: (creep: Creep) => boolean
    // creep 工作时执行的方法
    target?: (creep: Creep) => any
    // creep 非工作(收集能量时)执行的方法
    source?: (creep: Creep) => any
    // 更新状态时触发的方法，为 true 执行 target，为 false 执行 source
    switch?: (creep: Creep) => boolean
    // 要进行孵化的房间
    spawnRoom: string
    // 身体部件类型, 必须是 setting.ts 中 bodyConfigs 中的键，该属性和 bodys 必须指定一个
    bodyType?: string
    // 强制指定身体部件，如果指定的话将会忽略 bodyType
    bodys?: BodyPartConstant[]
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
    12900: BodyPartConstant[]
}

/**
 * 身体配置项类别
 * 包含了所有角色类型的身体配置
 */
interface IBodyConfigs {
    [roleType: string]: BodyConfig
}

// 终端监听任务
interface ITerminalListenerTask { 
    // 要监听的资源类型
    type: ResourceConstant,
    // 期望数量 
    amount: number,
    // 监听类型: max, min, all 
    mod: string, 
    // 补充来源: market, share
    supplementAction: string 
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
    powerIndex: number, 
    // 当前要处理的工作
    // 字段值均为 PWR_* 常量
    // 在该字段不存在时将默认执行 PWR_GENERATE_OPS（如果 power 资源足够并且 ops 不足时）
    task: PowerConstant,
    // 工作的房间名，在第一次出生时由玩家指定，后面会根据该值自动出生到指定房间
    workRoom: string
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