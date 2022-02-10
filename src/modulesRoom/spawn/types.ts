import { CreepRole } from '@/role/types/role'
import { BodyString, EnvContext } from '@/utils'

export type SpawnContext = {
    /**
     * 重要角色数组
     * 应填写支持房间运维的角色，例如 source 采集或者搬运工
     * 默认情况下如果一个爬因为能量不足而无法孵化时，将被挂起到队列末尾放置堵塞其他爬的孵化
     * 而如果一个爬的 role 在此数组中，对应爬的孵化任务将会被卡在队列最前面直到可以孵化为止
     */
    importantRoles?: string[]
    /**
     * 获取指定房间的 spawn 内存存放位置
     */
    getMemory: (room: Room) => SpawnMemory
    /**
     * 获取指定房间的 spawn 数组
     * 用于接入建筑缓存
     */
    getSpawn: (room: Room) => StructureSpawn[]
    /**
     * 请求填充能量
     * 调用后应有单位将 spawn 和 extension 中的能量填满
     */
    requestFill: (room: Room) => unknown
    /**
     * 请求 power 填充能量
     * 调用后应有 powerCreep 执行 PWR_OPERATE_EXTENSION
     */
    requestPowerExtension?: (room: Room) => unknown
} & EnvContext

export interface SpawnMemory {
    /**
     * 当前正在孵化的 creep
     * 用于在孵化完成后触发对应回调
     */
    spawning?: Record<string, true>
    /**
     * 该房间的孵化队列数据
     */
    spawnList?: SpawnTask[]
    /**
     * 当前是否外借 spawn
     */
    lendSpawn?: boolean
}

/**
 * 孵化任务
 */
export interface SpawnTask {
    /**
     * 要孵化的 creep 名称
     */
    name: string
    /**
     * 该 Creep 的角色
     */
    role: string
    /**
     * 该 creep 所需的 data
     */
    data?: Record<string, any>
    /**
     * 身体部件数组
     */
    bodys: BodyString
}

/**
 * 房间运维基础单位
 */
export type BaseUnits = CreepRole.Worker | CreepRole.Manager

/**
 * 房间基础运维单位的动态调整上下限
 * 用于规定不同时期动态调整的范围
 */
export type BaseUnitLimit = {
    MAX: number
    MIN: number
}

/**
 * 房间内所有基础单位的限制
 */
export type RoomBaseUnitLimit = {
    [role in BaseUnits]: BaseUnitLimit
}

/**
 * 该孵化模块可以对外提供的能力
 */
export interface UseSpawnContext {
    /**
     * 添加孵化任务
     */
    addSpawnTask: <D = Record<string, any>>(room: Room, name: string, role: string, bodys: BodyPartConstant[], data?: D) => unknown
     /**
      * 添加孵化任务回调
      * 调用后，在传入的 role 类型 creep 孵化时应调用 callbackFunc 方法
      */
    addSpawnCallback: (role: string, callbackFunc: (creep: Creep) => unknown) => unknown
}
