import { UseSpawnContext } from '@/modulesRoom/spawn'
import { RoleMemory } from '@/modulesRoom/unitControl'
import { EnvContext } from '@/utils'
import { Goto } from '../move'

export type ReiveContext = {
    /**
     * 掠夺单位角色名，默认为 reiver
     */
    reiverRole?: string
    /**
     * 获取掠夺单位内存
     */
    getMemory: () => ReiveMemory
    /**
     * 自定义移动
     * 用于接入对穿移动
     */
    goTo: Goto
    /**
     * 回调 - 当 creep 工作阶段发生变化
     * 例如 worker 从拿取能量转变为工作模式时
     */
    onCreepStageChange?: (creep: Creep, isWorking: boolean) => unknown
} & EnvContext & UseSpawnContext

/**
 * 掠夺模块内存
 */
export interface ReiveMemory {
    /**
     * 掠夺资源列表，如果存在的话 reiver 将只会掠夺该名单中存在的资源
     */
    reiveList?: ResourceConstant[]
    /**
     * 掠夺单位的内存
     * 键为房间名，值为该房间派出的掠夺单位
     */
    reiver?: Record<string, RoleMemory<ReiverMemory>>
}

/**
 * 掠夺单位名称
 */
export interface ReiverMemory {
    /**
     * 要掠夺的房间
     */
    targetRoomName: string
    /**
     * 掠夺得到的资源存到哪里
     */
    originRoomName: string
    /**
     * 掠夺是否完成
     */
    finished?: boolean
    /**
     * 要掠夺的建筑 id
     */
    targetStructureId?: Id<AnyStoreStructure> | ERR_NOT_FOUND
    /**
     * 要掠夺的墓碑 id
     */
    // targetTombstoneId?: Id<Tombstone> | ERR_NOT_FOUND
    /**
     * 要掠夺的掉在地上的资源 id
     */
    // targetDroppedResourceId?: Id<Resource> | ERR_NOT_FOUND
    /**
     * 要存放到的建筑
     */
    storeId?: Id<AnyStoreStructure> | ERR_NOT_FOUND
}
