import { MoveOpt } from '@/modulesGlobal/move/types'
import { HarvestMode } from '@/modulesRoom/harvest'
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
         * creep 的角色
         */
        role: string
        /**
         * 是否在工作
         */
        working?: boolean
        /**
         * 要填充的墙 id
         */
        fillWallId?: Id<StructureWall | StructureRampart>
    }

    /**
     * Creep 拓展
     * 来自于 ./extension.ts
     */
    interface Creep {
        goTo(target?: RoomPosition, moveOpt?: MoveOpt): ScreepsReturnCode
        setWayPoint(target: string[] | string): ScreepsReturnCode
        upgradeRoom(roomName: string): ScreepsReturnCode
        buildRoom(roomName: string): ScreepsReturnCode
        getEngryFrom(target: AllEnergySource): ScreepsReturnCode
    }
}

/**
 * creep 的角色枚举
 */
export enum CreepRole {
    Harvester = 'harvester',
    Miner = 'miner',
    Worker = 'worker',
    Manager = 'manager',
    Claimer = 'claimer',
    Reserver = 'reserver',
    Signer = 'signer',
    PbHealer = 'pbHealer',
    PbAttacker = 'pbAttacker',
    PbCarrier = 'pbCarrier',
    RemoteHarvester = 'remoteHarvester',
    RemoteHelper = 'RemoteHelper',
    Reiver = 'reiver',
    Defender = 'defender',
}
