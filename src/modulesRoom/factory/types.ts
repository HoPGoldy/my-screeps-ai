import { EnvContext } from '@/utils'
import { RoomShareTask } from '../share/types'
import { TransportRequest } from '../taskTransport/types'
import { FactoryState, FactoryTransportType } from './constants'

export type FactoryContext = {
    /**
     * 获取指定房间的 factory 内存对象
     */
    getMemory: (room: Room) => FactoryMemory
    /**
     * 获取全局的 factory 内存对象
     */
    getGlobalMemory: () => { [level in FactoryLevel]?: string[] }
    /**
     * 当前是否存在指定物流任务
     */
    hasTransportTask: (room: Room, type: FactoryTransportType) => boolean
    /**
     * 新增物流任务任务
     */
    addTransportTask: (room: Room, type: FactoryTransportType, requests: TransportRequest[]) => unknown
    /**
     * 获取房间中某个资源储量
     */
    getResourceAmount: (room: Room, resType: ResourceConstant) => number
    /**
     * 获取本房间内想要获取某个资源应该去哪里找
     */
    getResourceStorePlace: (room: Room, resType: ResourceConstant, amount: number) => AnyStoreStructure
    /**
     * 获取房间中的 factory
     * 用于接入建筑缓存
     */
    getFactory: (room: Room) => StructureFactory
    /**
     * 获取房间中存在的共享任务（本房间共享给其他房间）
     * 没有任务则返回 undefined
     */
    getRoomShareTask: (room: Room) => RoomShareTask | undefined
    /**
     * 添加共享任务
     * 执行后应有指定资源会发送到 room
     *
     * @param room 期望接受资源的房间
     * @param resType 发送资源类型
     * @param amount 共享数量
     */
    requestShare: (room: Room, resType: ResourceConstant, amount: number) => unknown
    /**
     * 回调 - 当可以提供某种资源时触发
     */
    onCanProvideResource?: (room: Room, resType: CommodityConstant) => unknown
    /**
     * 回调 - 当**不**可以提供某种资源时触发
     */
    onCantProvideResource?: (room: Room, resType: CommodityConstant) => unknown
    /**
     * 回调 - 当生产完某种资源时触发
     */
    onFinishProduce?: (room: Room, resType: CommodityConstant, amount: number) => unknown
    /**
     * 请求强化指定房间的 factory
     */
    requestPowerFactory: (room: Room, factory: StructureFactory) => unknown
} & EnvContext

/**
 * 工厂的内存
 */
export interface FactoryMemory {
    /**
     * 当前房间的工厂等级，由用户指定
     */
    level?: FactoryLevel
    /**
     * 下个顶级产物索引
     */
    targetIndex?: number
    /**
     * 本工厂参与的生产线类型
     */
    depositTypes?: DepositConstant[]
    /**
     * 当该字段为真并且工厂在冷却时，就会执行一次底物是否充足的检查，执行完就会直接将该值移除
     */
    produceCheck?: boolean
    /**
     * 当前工厂所处的阶段
     */
    state?: FactoryState
    /**
     * 工厂生产队列
     */
    taskList?: FactoryTask[]
    /**
     * 工厂是否即将移除
     * 在该字段存在时，工厂会搬出所有材料，并在净空后移除 room.factory 内存
     * 在净空前手动删除该字段可以终止移除进程
     */
    remove?: true
    /**
     * 工厂是否暂停，该属性优先级高于 sleep，也就是说 sleep 结束的时候如果有 pause，则工厂依旧不会工作
     */
    pause?: true
    /**
     * 工厂休眠时间，如果该时间存在的话则工厂将会待机
     */
    sleep?: number
    /**
     * 休眠的原因
     */
    sleepReason?: string
    /**
     * 玩家手动指定的目标，工厂将一直合成该目标
     */
    specialTraget?: CommodityConstant
}

/**
 * 工厂的任务队列中的具体任务配置
 */
export interface FactoryTask {
    /**
     * 任务目标
     */
    target: CommodityConstant,
    /**
     * 该任务要生成的数量
     */
    amount: number
}

/**
 * 所有可用的工厂等级
 */
export type FactoryLevel = 1 | 2 | 3 | 4 | 5

/**
 * 工厂 1-5 级能生产的顶级商品
 */
export type TopTargetConfig = {
    [level in FactoryLevel]: CommodityConstant[]
}
