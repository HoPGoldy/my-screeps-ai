import { EnvContext } from '@/utils'

export type UnitControlContext<T = unknown, C = unknown> = {
    getMemory: (room: Room) => Record<string, UnitMemory<T>>
    /**
     * 回调 - 在 creep 去世时触发
     * 该方法执行结束后，死亡 creep 的内存将会被自动清空
     *
     * @param creepName 死去 creep 的名字
     * @param memory creep 一直在使用的内存
     * @param workRoom creep 所在的工作房间
     * @param context 设置给 creep 的运行时环境
     */
    onCreepDead?: (creepName: string, memory: UnitMemory<T>, workRoom: Room, context: C) => unknown
    /**
     * 回调 - 在 creep 的阶段变更时触发
     *
     * @param creep 触发变更的 creep
     * @param isWorking 新的阶段是否为 work 阶段，为 false 代表当前为 source 阶段
     */
    onCreepStageChange?: (creep: Creep, isWorking: boolean) => unknown
    runPrepare?: (creep: Creep, memory: UnitMemory<T>, workRoom: Room, context: C) => boolean
    runTarget: (creep: Creep, memory: UnitMemory<T>, workRoom: Room, context: C) => boolean
    runSource?: (creep: Creep, memory: UnitMemory<T>, workRoom: Room, context: C) => boolean
} & Partial<EnvContext>

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

export type UnitMemory<T = unknown> = {
    /**
     * creep 是否已经准备好可以工作了
     */
    ready?: boolean
    /**
     * 为 true 代表在执行 stageA，否则代表在执行 stageB
     */
    working: boolean
    /**
     * 该单位是否为提前注册单位
     */
    registration?: true
} & T

export type RoleMemory<T = unknown> = Record<string, UnitMemory<T>>
