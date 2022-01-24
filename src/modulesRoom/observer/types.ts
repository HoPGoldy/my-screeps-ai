import { EnvContext } from '@/utils'
import { UseSpawnContext } from '../spawn'
import { RoleMemory } from '../unitControl/types'
import { PbHarvestState } from './constants'

export type ObserverContext = {
    /**
     * 允许最多同时采集多少个 pb
     */
    pbMax?: number
    /**
     * 允许最多同时采集多少个 deposit
     */
    depoMax?: number
    /**
     * deposit 采集到多少冷却的时候将会放弃继续采集
     * 默认为 100
     */
    depoMaxCooldown?: number
    /**
     * observer 的房间扫描间隔
     */
    obInterval?: number
    /**
     * pb 自动的旗帜名字前缀
     */
    pbFlagPrefix?: string
    /**
     * deposit 自动插的旗帜名字前缀
     */
    depoFlagPrefix?: string
    /**
     * depo 采集单位的角色名
     */
    depositHarvesterRole?: string
    /**
     * pb 采集小组 - 采集单位角色名
     */
    pbAttackerRole?: string
    /**
     * pb 采集小组 - 治疗单位的角色名
     */
    pbHealerRole?: string
    /**
     * pb 采集小组 - 搬运单位的角色名
     */
    pbCarrierRole?: string
    /**
     * 获取 ob 的工作内存对象
     */
    getMemory: (room: Room) => ObserverMemory
    /**
     * 获取房间中的 ob
     * 用于接入建筑缓存
     */
    getObserver: (room: Room) => StructureObserver
    /**
     * 回调 - pb 采集完成后触发
     * 注意，因为 pb 搬运小队有可能会有多人，所以这个方法会被调用多次
     */
    onPbTransferFinish?: (room: Room) => unknown
    /**
     * 回调 - 当 creep 工作阶段发生变化
     * 例如 harvester 从采集能量转变为存放能量模式时
     */
    onCreepStageChange?: (creep: Creep, isWorking: boolean) => unknown
} & EnvContext & UseSpawnContext

export interface ObserverMemory {
    /**
     * 上个 tick 已经 ob 过的房间名
     */
    checkRoomName?: string
    /**
     * 遍历 watchRooms 所使用的索引
     */
    watchIndex?: number
    /**
     * 监听的房间列表
     */
    watchRooms?: string[]
    /**
     * 当前正在采集的 powerBank 旗帜名数组
     */
    pbList?: string[]
    /**
     * 当前正在采集的 depo 旗帜名数组
     */
    depoList?: string[]
    /**
     * 是否暂停，为 true 时暂停
     */
    pause?: boolean
    /**
     * depo 采集单位内存
     */
    depositHarvester?: RoleMemory<DepositHarvesterMemory>
    /**
     * pb 攻击单位内存
     */
    pbAttacker?: RoleMemory<PbAttackerMemory>
    /**
     * pb 治疗单位内存
     */
    pbHealer?: RoleMemory<PbHealerMemory>
    /**
     * pb 搬运单位内存
     */
    pbCarrier?: RoleMemory<PbCarrierMemory>
}

/**
 * deposit 采集单位需要的内存字段
 */
export interface DepositHarvesterMemory {
    /**
     * 要采集的资源旗帜名称
     */
    sourceFlagName: string
    /**
     * 要采集的 deposit 类型
     */
    depositType?: DepositConstant
    /**
     * deposit 当前的冷却时间
     */
    depositCooldown?: number
    /**
     * 抵达目标需要的时间
     */
    travelTime?: number
    /**
     * 公路房旗帜特有，travelTime 是否已经计算完成
     */
    travelComplete?: boolean
    /**
     * 该旗帜下标注的 deposit id
     */
    sourceId?: Id<Deposit>
}

export interface PbCarrierMemory {
    /**
     * 要采集的 pb 旗帜名称
     */
    sourceFlagName: string
}

export interface PbHealerMemory {
    /**
     * 要治疗的单位名称
     */
    creepName: string
}

export interface PbAttackerMemory {
    /**
     * 要采集的 pb 旗帜名
     */
    sourceFlagName: string
    /**
     * 正在采集的 pb id
     */
    pbId?: Id<StructurePowerBank>
    /**
     * 抵达目标需要的时间
     */
    travelTime?: number
    /**
     * 自己配对治疗单位的名字
     */
    healerCreepName: string
}

declare global {
    interface FlagMemory {
        /**
         * 当前 powerbank 采集的状态
         */
        state?: PbHarvestState
    }
}
