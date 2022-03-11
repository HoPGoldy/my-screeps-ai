import { WithDelayCallback } from '@/modulesGlobal/delayQueue'
import { Goto } from '@/modulesGlobal/move'
import { EnvContext } from '@/utils'
import { UseSpawnContext } from '../spawn'
import { RoleMemory } from '../unitControl'

export type RemoteContext = {
    /**
     * 外矿采集单位的角色名
     * 默认为 remoteHarvester
     */
    remoteHarvesterRole?: string
    /**
     * 房间预定单位的角色名
     * 默认为 reserver
     */
    reserverRole?: string
    /**
     * 房间占领单位的角色名
     * 默认为 claimer
     */
    claimerRole?: string
    /**
     * 新房协助单位的角色名
     * 默认为 remoteHelper
     */
    remtoeHelperRole?: string
    /**
     * 签名单位的角色名
     * 默认为 signer
     */
    signerRole?: string
    /**
     * 获取内存存放对象
     */
    getMemory: (room: Room) => RemoteMemory
    /**
     * 自定义移动
     * 用于接入对穿移动
     */
    goTo: Goto
    /**
     * 获取房间中的 link
     * 用于接入建筑缓存
     */
    getLink: (room: Room) => StructureLink[]
    /**
     * 获取房间中的 container
     * 用于接入建筑缓存
     */
    getContainer: (room: Room) => StructureContainer[]
    /**
     * 获取房间中的 spawn
     * 用于接入建筑缓存
     */
    getSpawn: (room: Room) => StructureSpawn[]
    /**
     * 获取房间中的能量矿
     * 用于接入建筑缓存
     */
    getSource: (room: Room) => Source[]
    /**
     * 创建延迟任务
     */
    withDelayCallback: WithDelayCallback
    /**
     * 建设指定房间中的工地
     * 应包含移动逻辑
     */
    buildRoom: (creep: Creep, targetRoomName: string) => ScreepsReturnCode
    /**
     * 回调 - 当 creep 工作阶段发生变化
     * 例如 worker 从拿取能量转变为工作模式时
     */
    onCreepStageChange?: (creep: Creep, isWorking: boolean) => unknown
    /**
     * 在指定房间中查找可以放置基地的位置
     *
     * @param roomName 要搜索的房间名
     * @returns 可以放置基地的中心点
     */
    findBaseCenterPos: (roomName: string) => RoomPosition[]
    /**
     * 确定基地选址
     * 当存在多个基地中心待选点位时，可以通过这个方法来挑选
     *
     * @param targetPos 待选的中心点数组
     */
    confirmBaseCenter?: (room: Room, targetPos: RoomPosition[]) => RoomPosition | ERR_NOT_FOUND
    /**
     * 回调 - 当占领单位确定了最终的基地中心点位时
     * @param pos 中心点位
     */
    onBaseCenterConfirmed?: (room: Room, centerPos: RoomPosition) => unknown
    /**
     * 回调 - 房间占领成功
     * 可以在这里发布支援单位
     *
     * @param claimRoom 被占领的房间
     * @param originRoom 发布占领单位的源房间
     */
    onClaimSuccess?: (claimRoom: Room, originRoom: Room) => unknown
} & EnvContext & UseSpawnContext

/**
 * 外矿配置信息
 */
export interface RemoteConfig {
    /**
     * 该外矿什么时候可以恢复采集，在被入侵时触发
     */
    reharvestTick?: number
    /**
     * 该外矿要把能量运到哪个建筑里，保存下来是为了后面方便自动恢复外矿采集
     */
    targetId?: Id<AnyStoreStructure>
}

/**
 * 外矿全量信息
 */
export type RemoteShowInfo = {
    /**
     * 外矿所在房间名
     */
    remoteRoomName: string
    /**
     * 要采集的外矿 id
     */
    sourceId: Id<Source>
} & RemoteConfig

export interface RemoteMemory {
    /**
     * 外矿采集单位内存
     */
    harvester?: RoleMemory<RemoteHarvesterMemory>
    /**
     * 预定单位内存
     */
    reserver?: RoleMemory<ReserverMemory>
    /**
     * 占领单位内存
     */
    claimer?: RoleMemory<ClaimerMemory>
    /**
     * 签名单位内存
     */
    signer?: RoleMemory<SignerMemory>
    /**
     * 新房协助单位内存
     */
    helper?: RoleMemory<RemoteHelperMemory>
    /**
     * 外矿配置信息
     * 外层键为房间名，内层键为 source id
     */
    config?: Record<string, Record<string, RemoteConfig>>
}

/**
 * 外矿采集单位的内存
 */
export interface RemoteHarvesterMemory {
    /**
     * 外矿所在房间名
     */
    roomName: string
    /**
     * 要采集的source名称
     */
    sourceId: Id<Source>
    /**
     * 是否已经请求过 reserver 发布了
     * 一个采集单位一辈子只能请求一次
     */
    callReserver?: boolean
    /**
     * 当该值为 true 时将不会尝试建造
     */
    dontBuild?: boolean
}

/**
 * 外矿预定单位的内存
 */
export interface ReserverMemory {
    /**
     * 要预定的房间名
     */
    targetRoomName: string
}

/**
 * 外矿预定单位的内存
 */
export interface ClaimerMemory {
    /**
     * 要占领的房间名
     */
    targetRoomName: string
    /**
     * 占领时可以选择性的签个名
     */
    sign?: string
    /**
     * 新房间占领后的基地中心旗帜名
     * 为空则自行挑选
     */
    center?: string
    /**
     * 当玩家没有指定中心时（即不存在上面的 center 属性），就会运行中心自动挑选
     * 挑选结果就保存在这里
     */
    centerCandidates?: [number, number][]
}

/**
 * 签名单位内存
 */
export interface SignerMemory {
    /**
     * 要签名的房间
     */
    targetRoomName: string
    /**
     * 要签的内容
     */
    sign: string
}

export type EnergySource = StructureContainer | StructureStorage | Resource<RESOURCE_ENERGY> | Source

/**
 * 新房协助单位内存
 */
export interface RemoteHelperMemory {
    /**
     * 要建造的新房名
     */
    targetRoomName: string
    /**
     * 要采集的 sourceId
     */
    sourceId?: Id<EnergySource>
    /**
     * 是否已经建造完了所有的工地（这辈子将不会再次执行建造工作）
     */
    dontBuild?: boolean
}

/**
 * 外矿恢复采集任务数据
 */
export interface DelayRemoteHarvestData {
    /**
     * 源房间名
     */
    roomName: string
    /**
     * 被采集的外矿房间房名
     */
    remote: string
    /**
     * 要采集的外矿 id
     */
    sourceId: Id<Source>
}

export type UnitWorkContext = (room: Room) => ({
    isDisabled: (remoteRoomName: string, sourceId: string) => boolean
    remove: (remoteRoomName: string) => OK | ERR_NOT_FOUND
    disableRemote: (remote: string, sourceId: Id<Source>, disableTick?: number) => unknown
    getRemoteEnergyStore: (remoteRoomName: string, sourceId: string, ignoreCache?: boolean) => AnyStoreStructure
})
