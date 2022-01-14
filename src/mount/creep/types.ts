import { MoveInfo, MoveOpt } from '@/modulesGlobal/move/types'
import { HarvestMode } from '@/role/base/harvester'
import { CreepRole, RoleDatas } from '@/role/types/role'
import { Color } from '@/utils'

declare global {
    /**
     * creep 内存拓展
     */
    interface CreepMemory {
        /**
         * 来自的 shard
         * 在死后会向这个 shard 发送孵化任务
         * creepController 会通过这个字段检查一个 creep 是不是跨 shard creep
         */
        fromShard?: ShardName
        /**
         * creep 是否已经准备好可以工作了
         */
        ready?: boolean
        /**
         * creep 的角色
         */
        role: string
        /**
         * 是否在工作
         */
        working?: boolean
        /**
         * creep 在工作时需要的自定义配置，在孵化时由 spawn 复制
         */
        data?: RoleDatas[CreepRole]
        /**
         * 能量采集单位特有，当前的采集模式
         */
        harvestMode?: HarvestMode
        /**
         * 该 Creep 是否在进行工作（站着不动）
         */
        stand?: boolean
        /**
         * 要采集的资源 Id
         */
        sourceId?: Id<AllEnergySource>
        /**
         * 要存放到的目标建筑
         */
        targetId?: Id<Source | AnyStoreStructure | ConstructionSite>
        /**
         * 要维修的建筑 id，维修单位特有
         */
        repairStructureId?: Id<AnyStructure>
        /**
         * deposit 采集者特有，deposit 的类型
         */
        depositType?: DepositConstant
        /**
         * 要填充的墙 id
         */
        fillWallId?: Id<StructureWall | StructureRampart>
        /**
         * manager 特有 要填充能量的建筑 id
         */
        fillStructureId?: Id<AnyStoreStructure>
        /**
         * 可以执行建筑的单位特有，当该值为 true 时将不会尝试建造
         */
        dontBuild?: boolean
        /**
         * manager 特有，当前任务正在转移的资源类型
         */
        taskResource?: ResourceConstant
        /**
         * 城墙填充特有，当前期望的城墙生命值
         */
        expectHits?: number
        /**
         * harvester 允许自己再次尝试发布 power 强化 Soruce 任务的时间
         * 在 Game.time 小于该值时不会尝试发布强化任务
         */
        regenSource?: number
        /**
         * 移动到某位置需要的时间
         * 例如：miner 会用它来保存移动到 mineral 的时间
         */
        travelTime?: number
        /**
         * 目标旗帜的名称
         */
        targetFlagName?: string
        /**
         * 当前正在执行的初始 container 能量转移到 storage 的任务索引
         * harvester 特有
         */
        energyTransferId?: number
    }

    /**
     * Creep 拓展
     * 来自于 ./extension.ts
     */
    interface Creep {
        log(content: string, color?: Color, notify?: boolean): void
        onWork(): void
        goTo(target?: RoomPosition, moveOpt?: MoveOpt): ScreepsReturnCode
        setWayPoint(target: string[] | string): ScreepsReturnCode
        upgradeRoom(roomName: string): ScreepsReturnCode
        buildRoom(roomName: string): ScreepsReturnCode
        getEngryFrom(target: AllEnergySource): ScreepsReturnCode
        transferTo(target: AnyCreep | Structure, RESOURCE: ResourceConstant, moveOpt?: MoveOpt): ScreepsReturnCode
        backToGetEnergy(): true
    }
}
