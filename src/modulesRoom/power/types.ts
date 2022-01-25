import { Goto } from '@/modulesGlobal/move'
import { EnvContext } from '@/utils'

export interface PowerMemory {
    /**
     * power 任务请求队列
     * 由建筑物发布，powerCreep 查找任务时会优先读取该队列
     */
    tasks?: PowerConstant[]
    /**
     * 为 true 时执行 target，否则执行 source
     */
    working?: boolean
    /**
     * 要添加 REGEN_SOURCE 的能量矿 id
     */
    sourceId?: Id<Source>
}

export interface GlobalPowerMemory {
    /**
     * 当前受控于本模块的 creep，键为 pc 的名字，值为 pc 工作于哪个房间
     */
    creeps?: Record<string, string>
}

export type PowerContext = {
    getMemory: (room: Room) => PowerMemory
    getGlobalMemory: () => GlobalPowerMemory
    /**
     * 自定义移动
     * 用于接入对穿移动
     */
    goTo: Goto
    /**
     * 获取房间中某种资源的存放建筑
     */
    getResourceStructure: (room: Room, resType: ResourceConstant, amount: number) => AnyStoreStructure | undefined
    /**
     * 获取房间中某种资源的存量
     */
    getResourceAmount: (room: Room, resType: ResourceConstant) => number
    /**
     * 获取房间中的 factory
     * 用于接入建筑缓存
     */
    getFactory: (room: Room) => StructureFactory
    /**
     * 获取房间中的能量矿
     * 用于接入建筑缓存
     */
    getSource: (room: Room) => Source[]
    /**
     * 获取房间中的 ps
     * 用于接入建筑缓存
     */
    getPowerSpawn: (room: Room) => StructurePowerSpawn
    /**
     * 获取指定房间里工厂期望被设置的等级
     * 会在房间内发布了 PWR_OPERATE_FACTORY 任务后调用
     */
    getFactoryLevel: (room: Room) => number
} & EnvContext
