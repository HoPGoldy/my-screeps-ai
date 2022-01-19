import { WithDelayCallback } from '@/modulesGlobal/delayQueue/creator'
import { SourceUtils } from '@/modulesGlobal/source/sourceUtils'
import { EnvContext } from '@/utils'
import { TransportRequest } from '../taskTransport/types'
import { RoleMemory } from '../unitControl/types'

export type HarvestContext = {
    getMemory: (room: Room) => HarvestMemory
    /**
     * 指定元素矿采集单位的角色名，默认为 miner
     */
    minerRole?: string
    /**
     * 指定能量矿采集单位的角色名，默认为 harvester
     */
    harvesterRole?: string
    /**
     * source 管理工具
     */
    sourceUtils: SourceUtils
    /**
     * 创建延迟任务
     */
    withDelayCallback: WithDelayCallback
    /**
     * 获取房间中的元素矿
     * 用于接入建筑缓存
     */
    getMineral: (room: Room) => Mineral
    /**
     * 获取房间中的能量矿
     * 用于接入建筑缓存
     */
    getSource: (room: Room) => Source[]
    /**
     * 获取房间中的 spawn
     * 用于接入建筑缓存
     */
    getSpawn: (room: Room) => StructureSpawn[]
    /**
     * 添加孵化任务
     */
    addSpawnTask: <D = Record<string, any>>(room: Room, name: string, role: string, bodys: BodyPartConstant[], data?: D) => unknown
    /**
     * 添加孵化任务回调
     * 调用后，在传入的 role 类型 creep 孵化时应调用 callbackFunc 方法
     */
    addSpawnCallback: (role: string, callbackFunc: (creep: Creep) => unknown) => unknown
    /**
     * 获取房间中某个资源储量
     */
    getResourceAmount: (room: Room, resType: ResourceConstant) => number
    /**
     * 放置建筑工地
     * 调用后应当在指定位置放置一个对应类型的工地
     * 用于接入建造管理模块
     */
    addConstructionSite: (pos: RoomPosition, type: BuildableStructureConstant) => unknown
    /**
     * 添加容器建造任务
     * 调用后应当在指定 source 旁查找 container 并建造
     * 用于接入工作任务模块
     */
    addBuildCotainerTask: (room: Room, source: Source) => unknown
    /**
     * 添加容器维修任务
     * 用于接入工作任务模块
     */
    addRepairContainerTask: (room: Room, container: StructureContainer) => unknown
    /**
     * 获取一个房间的搬运工数量
     */
    getRoomTransportor: (room: Room) => Creep[]
    /**
     * 获取是否存在指定的物流任务
     */
    hasTransportTask: (room: Room, taskId: string | number) => boolean
    /**
     * 新增物流任务任务
     * @returns 该任务的唯一 id
     */
    addTransportTask: (source: Source, requests: TransportRequest[]) => string | number
    /**
     * 请求 power 强化 source
     * @returns 需返回是否强化成功（成功返回 true，失败返回 false）
     */
    requestPowerSource: (source: Source) => boolean
    /**
     * 回调 - 当 creep 工作阶段发生变化
     * 例如 harvester 从采集能量转变为存放能量模式时
     */
    onCreepStageChange?: (creep: Creep) => unknown
} & EnvContext

export interface HarvestMemory {
    miners?: Record<string, RoleMemory>
    harvesters?: Record<string, RoleMemory<HarvesterMemory>>
}

/**
 * 能量采集单位的内存
 */
export interface HarvesterMemory {
    /**
     * 自己要采集哪个 source
     */
    sourceId: Id<Source>
    /**
     * 当前的工作策略
     */
    mode?: HarvestMode
    /**
     * 要存放到的目标建筑 id
     */
    storeId?: Id<AnyStoreStructure>
    /**
     * 要站立到的采集能量的位置
     * 在能量采集单位第一次到达 source 旁确定
     */
    standPos?: string
    /**
     * harvester 允许自己再次尝试发布 power 强化 Soruce 任务的时间
     * 在 Game.time 小于该值时不会尝试发布强化任务
     */
    regenSource?: number
    /**
     * 该 source 对应发布的能量转移任务 id
     */
    transferTaskId?: string | number
}

/**
 * 能量采集单位的行为模式
 */
export enum HarvestMode {
    /**
     * 启动模式
     * 会采集能量然后运送会 spawn 和 extension
     */
    Start = 1,
    /**
     * 简单模式
     * 会无脑采集能量，配合 container 使用
     */
    Simple,
    /**
     * 转移模式
     * 会采集能量然后存放到指定建筑，配合 link 使用
     */
    Transport
}

/**
 * 能量采集单位的某种采集策略
 */
export type HarvesterActionStrategy = {
    prepare: HarvesterActionStage
    source: HarvesterActionStage
    target: HarvesterActionStage
}

type HarvesterActionStage = (creep: Creep, source: Source, memory: HarvesterMemory) => boolean
