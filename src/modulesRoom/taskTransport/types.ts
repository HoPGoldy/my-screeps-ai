import { Goto } from '@/modulesGlobal/move'
import { SourceUtils } from '@/modulesGlobal/source'
import { EnvContext } from '@/utils'
import { StructureShortcutKey } from '../shortcut'
import { UseSpawnContext } from '../spawn'
import { RoomTask, TaskBaseMemory } from '../taskBase'

export type TransportContext = {
    /**
     * 工作单位的名称（和孵化时使用的角色名）
     * 默认为 manager
     */
    roleName?: string
    /**
     * 获取内存存放对象
     */
    getMemory: (room: Room) => TransportMemory
    /**
     * 自定义移动
     * 用于接入对穿移动
     */
    goTo: Goto
    /**
     * source 管理工具
     */
    sourceUtils: SourceUtils
    getContainer: (room: Room) => StructureContainer[]
    getSource: (room: Room) => Source[]
    getStructure: <T extends StructureShortcutKey>(room: Room, structureType: T) => ConcreteStructure<T>[]
    /**
     * 回调 - 当 creep 工作阶段发生变化
     * 例如 worker 从拿取能量转变为工作模式时
     */
    onCreepStageChange?: (creep: Creep, isWorking: boolean) => unknown
} & EnvContext & UseSpawnContext

export type TransportMemory = TaskBaseMemory<TransportTaskMemory, ManagerData>

/**
 * 所有的物流任务类型
 * 没什么实际作用，只是方便使用者搜索自己的任务
 */
export enum TransportTaskType {
    ContainerEnergyTransfer = 'cet',
    FillExtension = 'fe',
    FillTower = 'ft',
    FillNuker = 'fn',
    FillPowerSpawn = 'fps',
    LabIn = 'li',
    LabOut = 'lo',
    LabGetEnergy = 'lge',
    FactoryGetResource = 'fgr',
    FactoryPutResource = 'fpr',
    Share = 's',
    StorageBlance = 'sb',
    Terminal = 't',
    CenterLink = 'cl'
}

/**
 * 物流任务工作处理上下文
 */
export interface ManagerWorkContext {
    /**
     * 物流任务所处的房间
     */
    workRoom: Room
    /**
     * 当前执行任务的爬
     */
    manager: Creep
    /**
     * 该任务的数据
     */
    taskData: TransportTaskMemory
    /**
     * 该搬运爬的数据
     */
    managerData: ManagerData
    /**
     * 请求结束该任务
     */
    requireFinishTask: (reason: TaskFinishReason) => void
}

export type InnerGetTransportController = (room: Room) => ({
    requireFinishTask: (task: TransportTaskMemory, reason: TaskFinishReason, requestCreep: Creep) => void
    countWorkTime: () => void
    countLifeTime: () => void
    getUnitTask: (creep: Creep) => TransportTaskMemory
})

export type ManagerActionStrategy = (workContext: ManagerWorkContext) => unknown

/**
 * 房间物流任务
 */
export interface TransportTask<T = TransportRequest> {
    /**
     * 要搬运的资源
     */
    requests: T[]
}

/**
 * 物流任务的目标资源配置
 */
export interface TransportRequest {
    /**
     * 从哪里获取资源
     * 支持 id 和位置
     */
    from?: Id<AnyStoreStructure> | [number, number, string]
    /**
     * 资源搬运到哪里
     * 支持 id、位置、建筑常量
     */
    to?: Id<AnyStoreStructure | Creep | PowerCreep> | StructureConstant[] | [number, number, string]
    /**
     * 要转移的资源类型
     */
    resType: ResourceConstant
    /**
     * 要转移的数量，不填的话将会把目标填满或者把来源掏空
     */
    amount?: number
    /**
     * 当资源不足导致无法进行任务时，是否继续等待
     * @danger 置为 true 时将不会在资源不足时主动关闭任务，这会导致有搬运工一直卡在这个任务上
     * 请确保任务所需资源会尽快补足
     */
    keep?: boolean
}

export type TransportRequestData = TransportRequest & {
    /**
     * 正在处理该资源的搬运工名称
     */
    managerName?: string
    /**
     * 已经搬运完成了多少资源
     */
    arrivedAmount?: number
}

/**
 * 搬运工状态
 */
export enum ManagerState {
    /**
     * 清理身上的无用资源
     */
    ClearRemains = 1,
    /**
     * 获取要搬运的资源
     */
    GetResource,
    /**
     * 将资源搬运到目标
     */
    PutResource,
    /**
     * 临死之前处理后事
     */
    DeathClear,
}

/**
 * 物流任务完整版
 */
export type TransportTaskMemory = RoomTask & TransportTask<TransportRequestData>

/**
 * 搬运工数据
 */
export interface ManagerData {
    /**
     * 当前搬运状态
     */
    state: ManagerState
    /**
     * 缓存的来源 id
     */
    cacheSourceId?: Id<AnyStoreStructure | Resource>
    /**
     * 缓存的目标 id
     */
    cacheTargetId?: Id<AnyStoreStructure>
}

/**
 * 搬运任务完成原因
 */
export enum TaskFinishReason {
    /**
     * 完成搬运目标
     */
    Complete = 1,
    /**
     * 没有找到足够的资源
     */
    NotEnoughResource,
    /**
     * 没有找到资源存放目标
     */
    CantFindSource,
    /**
     * 没有找到要搬运到的目标
     */
    CantFindTarget
}

export type DestinationTarget = Creep | AnyStoreStructure | PowerCreep

export interface MoveTargetInfo<T = DestinationTarget> {
    /**
     * 目标
     * 如果任务指定的目标是一个位置的话，这个值会是 undefined
     */
    target?: T | undefined
    /**
     * 目标位置
     * 这个值为空说明运输任务找不到目标或者任务完成了
     */
    pos?: RoomPosition
}
