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
    findPathInRoom(target: RoomPosition): PathStep[]
    farMoveTo(target: RoomPosition, ignoreRoom?: string[]): 0|-1|-4|-11|-12|-5|-10
    newfarMoveTo(target: RoomPosition, ignoreRoom?: string[]): 0|-1|-4|-11|-12|-5|-10
    fillTower(): boolean
    upgrade(): boolean
    buildStructure(): boolean
    repairStructure(): boolean
    fillDefenseStructure(expectHits?: number): boolean
    getEngryFrom(target: Structure|Source): ScreepsReturnCode
    transferTo(target: Structure, RESOURCE: ResourceConstant): ScreepsReturnCode
    attackFlag()
    dismantleFlag()
    healTo(creeps: Creep[]): void
    getFlag(flagName: string): Flag|null
    farMoveByPathRooms(pathRooms: string[]): void
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
    // 远程寻路的路线缓存（新）
    farPath?: RoomPosition[]
    // 远程寻路的路线缓存（新新）
    movePath?: string
    // farPath 的移动索引，标志 creep 现在走到的第几个位置
    moveIndex?: number
    // deposit 采集者特有，deposit 的类型
    depositType?: DepositConstant
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

    /**
     * 下述方法在 @see /src/mount.room.ts 中定义
     */
    // 中央物流 api
    addCenterTask(task: ITransferTask): number
    hasCenterTask(submitId: string): boolean
    hangCenterTask(): number
    handleCenterTask(transferAmount: number): void
    getCenterTask(): ITransferTask | null
    // 房间物流 api
    addRoomTransferTask(task: RoomTransferTasks, priority?: number): number
    hasRoomTransferTask(taskType: string): boolean
    getRoomTransferTask(): RoomTransferTasks | null
    handleLabInTask(resourceType: ResourceConstant, amount: number): boolean
    handleRoomTransferTask(): void
    deleteCurrentRoomTransferTask(): void

    setFactoryTarget(resourceType: ResourceConstant): string
    getFactoryTarget(): ResourceConstant | null
    clearFactoryTarget(): string
    deleteCurrentCenterTask(): void
    shareRequest(resourceType: ResourceConstant, amount: number): boolean
    shareAdd(targetRoom: string, resourceType: ResourceConstant, amount: number): boolean
    
}

/**
 * 房间内存
 */
interface RoomMemory {
    // 中央集群的资源转移任务队列
    centerTransferTasks: ITransferTask[]
    // 房间物流任务队列
    transferTasks: RoomTransferTasks[]
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
    lab: {
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
        // 要进行反应的 outLab 索引
        outLabIndex: number
        // lab 是否暂停运行
        pause: boolean
    }
}

// 所有房间物流任务
type RoomTransferTasks = IFillTower | IFillExtension | IFillNuker | ILabIn | ILabOut | ILabGetEnergy

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

// 房间物流任务 - lab 能量填充
interface ILabGetEnergy {
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

// 资源共享任务
interface IShareTask {
    // 资源的提供房间
    source: string
    // 资源的接受房间
    target: string
    // 共享的资源类型
    resourceType: ResourceConstant,
    // 期望数量
    amount: number
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
    //全局共享任务
    roomShare: {
        // 共享任务实际存放的列表
        tasks: IShareTask[],
        // 当前要处理的共享任务索引
        taskIndex: number
    }
    // 资源来源表
    resourceSourceMap: {
        // 资源类型为键，房间名列表为值
        [resourceType: string]: string[]
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
    // 因为外矿房间有可能没视野
    // 所以把房间名缓存进内存
    roomName?: string
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
    // 准备阶段执行的方法, 返回 true 时代表准备完成
    prepare?: (creep: Creep) => boolean
    // creep 工作时执行的方法
    target?: (creep: Creep) => any
    // creep 非工作(收集能量时)执行的方法
    source?: (creep: Creep) => any
    // 更新状态时触发的方法，为 true 执行 target，为 false 执行 source
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