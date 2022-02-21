import { WithDelayCallback } from '@/modulesGlobal/delayQueue'
import { Goto } from '@/modulesGlobal/move'
import { SourceUtils } from '@/modulesGlobal/source'
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
     * 创建延迟任务
     */
    withDelayCallback: WithDelayCallback
    /**
     * source 管理工具
     */
    sourceUtils: SourceUtils
    /**
     * 回调 - 当 creep 工作阶段发生变化
     * 例如 worker 从拿取能量转变为工作模式时
     */
    onCreepStageChange?: (creep: Creep, isWorking: boolean) => unknown
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
