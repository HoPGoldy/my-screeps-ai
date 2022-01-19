import { EnvContext } from '@/utils'

export type UnitControlContext<T = unknown, C = unknown> = {
    getMemory: (room: Room) => Record<string, RoleMemory<T>>
    onCreepDead?: (creepName: string, memory: RoleMemory<T>, workRoom: Room, context: C) => unknown
    /**
     * 回调 - 在 creep 的阶段变更时触发
     *
     * @param creep 触发变更的 creep
     * @param isStageA 新的阶段是否为阶段 A，为 false 代表当前为阶段 B
     */
    onCreepStageChange?: (creep: Creep, isStageA: boolean) => unknown
    runPrepare?: (creep: Creep, memory: RoleMemory<T>, workRoom: Room, context: C) => boolean
    runStageA: (creep: Creep, memory: RoleMemory<T>, workRoom: Room, context: C) => boolean
    runStageB?: (creep: Creep, memory: RoleMemory<T>, workRoom: Room, context: C) => boolean
} & EnvContext

/**
 * creep 移除配置项
 */
export interface RemoveCreepOptions {
    /**
     * 【可选】是否批量移除，默认只会移除匹配到的第一个 creep
     */
    batch: boolean
    /**
     * 【可选】是否立刻移除，默认会在 creep 自然老死后移除
     */
    immediate: boolean
}

export type RoleMemory<T = unknown> = {
    /**
     * creep 是否已经准备好可以工作了
     */
    ready?: boolean
    /**
     * 为 true 代表在执行 stageA，否则代表在执行 stageB
     */
    working: boolean
} & T
