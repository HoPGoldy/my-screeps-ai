/**
 * 房间内存
 */
interface RoomMemory {
    /**
     * 该房间发起移除操作的时间
     * 执行移除时会检查该时间，如果已经过期的话将不会执行移除操作 
     */
    removeTime?: number
    /**
     * 该房间的生产队列，元素为 creepConfig 的键名
     */
    spawnList?: string[]
    /**
     * 需要放置的工地（CS）队列
     */
    delayCSList: string[]
    /**
     * 基地中心点坐标, [0] 为 x 坐标, [1] 为 y 坐标
     */
    center: [ number, number ]
    /**
     * 基地中心的待选位置, [0] 为 x 坐标, [1] 为 y 坐标
     */
    centerCandidates?: [ number, number ][]
    /**
     * 是否关闭自动布局，该值为 true 时将不会对本房间运行自动布局
     */
    noLayout: boolean
    /**
     * 中央集群的资源转移任务队列
     */
    centerTransferTasks: CenterTransferTask[]
    /**
     * 房间物流任务的备份数据
     * 会在全局重置时通过该数据重建物流任务
     */
    transportTasks: string
    /**
     * 房间工作任务的备份数据
     * 会在全局重置时通过该数据重建工作任务
     */
    workTasks: string
    /**
     * 由驻守在房间中的 pc 发布，包含了 pc 拥有对应的能力
     * 形如: "1 3 13 14"，数字即为对应的 PWR_* 常量
     */
    powers?: string
    /**
     * power 任务请求队列
     * 由建筑物发布，powerCreep 查找任务时会优先读取该队列
     */
    powerTasks: PowerConstant[]
    /**
     * 建筑工的当前工地目标，用于保证多个建筑工的工作统一以及建筑工死后不会寻找新的工地
     */
    constructionSiteId: Id<ConstructionSite>
    /**
     * 建筑工特有，当前正在修建的建筑类型，用于在修建完成后触发对应的事件
     */
    constructionSiteType?: StructureConstant
    /**
     * 建筑工地的坐标，用于在建造完成后进行 lookFor 来确认其是否成功修建了建筑
     */
    constructionSitePos: number[]
    /**
     * 工厂内存
     */
    factory?: FactoryMemory
    /**
     * observer 内存
     */
    observer?: ObserverMemory
    /**
     * lab 内存
     */
    lab?: LabMemory
    /**
     * 终端监听矿物列表
     * 数组中每一个字符串都代表了一个监听任务，形如 "0 0 power"
     * 第一位对应 TerminalModes，第二位对应 TerminalChannels，第三位对应资源类型
     */
    terminalTasks: string[]
    /**
     * 房间内终端缓存的订单id
     */
    targetOrderId?: Id<Order>
    /**
     * 房间内终端要立刻支援的房间名
     */
    targetSupportRoom?: string
    /**
     * 当前终端要监听的资源索引
     */
    terminalIndex: number
    /**
     * 中央 link 的 id
     */
    centerLinkId?: Id<StructureLink>
    /**
     * 升级 link 的 id
     */
    upgradeLinkId?: Id<StructureLink>
    /**
     * 外矿专用内存字段
     */
    remote: {
        /**
         * 外矿房间名
         */
        [roomName: string]: {
            /**
             * 该外矿什么时候可以恢复采集，在被入侵时触发
             */
            disableTill?: number
            /**
             * 该外矿要把能量运到哪个建筑里，保存下来是为了后面方便自动恢复外矿采集
             */
            targetId: Id<StructureWithStore>
        }
    }
    /**
     * 当前被 repairer 或 tower 关注的墙
     */
    focusWall: {
        id: Id<StructureWall | StructureRampart>
        endTime: number
    }
    /**
     * 当前房间所处的防御模式
     * defense 为基础防御，active 为主动防御，该值未定义时为日常模式
     */
    defenseMode?: 'defense' | 'active'
    /**
     * 该房间要执行的资源共享任务
     */
    shareTask: IRoomShareTask
    /**
     * 战争状态
     */
    war?: { }
    /**
     * boost 强化任务
     * @see doc/boost设计案
     */
    boost?: BoostTask
    /**
     * powerSpawn 是否暂停
     */
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
    /**
     * 当前房间物流单位的数量
     */
    transporterNumber?: number
    /**
     * 当前房间工作单位的数量
     */
    workerNumber?: number
    source: {
        [sourceId: string]: {
            containerId?: Id<StructureContainer>
            LinkId?: Id<StructureLink>
        }
    }
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

    /**
     * 当前房间中存在的敌人
     * 已拥有的房间特有，tower 负责维护
     */
    _enemys: (Creep|PowerCreep)[]
    /**
     * 需要维修的建筑，tower 负责维护，为 1 说明建筑均良好
     */
    _damagedStructure: AnyStructure | 1
    /**
     * 该 tick 是否已经有 tower 刷过墙了
     */
    _hasFillWall: boolean
    /**
     * 外矿房间特有，外矿单位维护
     * 一旦该字段为 true 就告诉出生点暂时禁止自己重生直到 1500 tick 之后
     */
    _hasEnemy: boolean
    /**
     * 焦点墙，维修单位总是倾向于优先修复该墙体
     */
    _importantWall: StructureWall | StructureRampart
    /**
     * 该房间是否已经执行过 lab 集群作业了
     * 在 Lab.work 中调用，一个房间只会执行一次
     */
    _hasRunLab: boolean

    /**
     * 建筑快捷访问
     */
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

    /**
     * pos 处理 api
     */
    serializePos(pos: RoomPosition): string
    unserializePos(posStr: string): RoomPosition | undefined

    /**
     * power 任务 api
     */
    addPowerTask(task: PowerConstant, priority?: number): OK | ERR_NAME_EXISTS | ERR_INVALID_TARGET
    deleteCurrentPowerTask(): void
    getPowerTask(): PowerConstant | undefined
    hangPowerTask(): void

    /**
     * 孵化队列 api
     * 下述方法在 @see /src/mount.room.ts 中定义
     */
    addSpawnTask(taskName: string): number | ERR_NAME_EXISTS
    hasSpawnTask(taskName: string): boolean
    clearSpawnTask(): void
    hangSpawnTask(): void

    /**
     * 中央物流 api
     */
    addCenterTask(task: CenterTransferTask, priority?: number): number
    hasCenterTask(submit: CenterStructures | number): boolean
    hangCenterTask(): number
    handleCenterTask(transferAmount: number): void
    getCenterTask(): CenterTransferTask | null
    deleteCurrentCenterTask(): void

    /**
     * 房间物流 api
     */
    transport: InterfaceTransportTaskController

    /**
     * 房间工作 api
     */
    work: InterfaceWorkTaskController

    /**
     * creep 发布
     */
    release: InterfaceCreepRelease

    /**
     * 工厂 api
     */
    setFactoryTarget(resourceType: ResourceConstant): string
    getFactoryTarget(): ResourceConstant | null
    clearFactoryTarget(): string

    /**
     * 资源共享 api
     */
    giver(roomName: string, resourceType: ResourceConstant, amount?: number): string
    shareRequest(resourceType: ResourceConstant, amount: number): boolean
    shareAddSource(resourceType: ResourceConstant): boolean
    shareRemoveSource(resourceType: ResourceConstant): void
    shareAdd(targetRoom: string, resourceType: ResourceConstant, amount: number): boolean

    /**
     * boost api 
     */
    boost(boostType: string, boostConfig: BoostConfig): OK | ERR_NAME_EXISTS | ERR_NOT_FOUND | ERR_INVALID_ARGS | ERR_NOT_ENOUGH_RESOURCES
    boostCreep(creep: Creep): OK | ERR_NOT_FOUND | ERR_BUSY | ERR_NOT_IN_RANGE

    /**
     * 战争相关 api
     */
    startWar(boostType: BoostType): OK | ERR_NAME_EXISTS | ERR_NOT_FOUND | ERR_INVALID_TARGET
    stopWar(): OK | ERR_NOT_FOUND

    /**
     * 自动规划相关
     */
    findBaseCenterPos(): RoomPosition[]
    confirmBaseCenter(targetPos?: RoomPosition[]): RoomPosition | ERR_NOT_FOUND
    setBaseCenter(pos: RoomPosition): OK | ERR_INVALID_ARGS
    planLayout(): string
    addRemote(remoteRoomName: string, targetId: string): OK | ERR_INVALID_TARGET | ERR_NOT_FOUND
    removeRemote(remoteRoomName: string, removeFlag?: boolean): OK | ERR_NOT_FOUND
    claimRoom(targetRoomName: string, signText?: string): OK
}

interface RoomPosition {
    directionToPos(direction: DirectionConstant): RoomPosition | undefined
    getFreeSpace(): RoomPosition[]
}