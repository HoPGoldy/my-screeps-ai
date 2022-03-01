import { EnvContext } from '@/utils'
import { RoomTask, TaskBaseMemory } from '@/modulesRoom/taskBase'
import { SourceUtils } from '@/modulesGlobal/source'
import { UseSpawnContext } from '../spawn'
import { Goto } from '@/modulesGlobal/move'
import { WithDelayCallback } from '@/modulesGlobal/delayQueue'

export type WorkTaskContext = {
    /**
     * 工作单位的名称（和孵化时使用的角色名）
     * 默认为 worker
     */
    roleName?: string
    /**
     * 获取内存存放对象
     */
    getMemory: (room: Room) => WorkTaskMemory
    /**
     * 自定义移动
     * 用于接入对穿移动
     */
    goTo: Goto
    /**
     * 获取房间中的能量存放建筑
     * 应返回工作单位可以取能量的建筑
     *
     * @param pos 想要获取能量的爬在哪个位置上，可以用这个来查找最近的能量来源
     */
    getEnergyStructure: (room: Room, pos: RoomPosition) => EnergyTarget
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

export type WorkerRuntimeContext = (room: Room) => ({
    removeTaskByKey: (taskKey: number) => OK | ERR_NOT_FOUND
    countWorkTime: () => void
    countLifeTime: () => void
    getUnitTask: (creep: Creep) => AllRoomWorkTask
})

export type WorkTaskMemory = TaskBaseMemory<AllRoomWorkTask>

/**
 * 所有的工作任务类型
 */
export enum WorkTaskType {
    Upgrade = 'upgrade',
    Build = 'build',
    BuildContainer = 'buildContainer',
    Repair = 'repair',
    FillWall = 'fillWall',
}

/**
 * 所有的房间工作任务
 */
export type AllRoomWorkTask = WorkTasks[WorkTaskType]

export interface TaskCacheMemory {
    cacheSourceId?: Id<AllEnergySource>
}

/**
 * 所有的工作任务
 */
export interface WorkTasks {
    /**
     * 升级任务
     */
    [WorkTaskType.Upgrade]: RoomTask<WorkTaskType.Upgrade> & TaskCacheMemory
    /**
     * 建造任务
     */
    [WorkTaskType.Build]: RoomTask<WorkTaskType.Build> & TaskCacheMemory
    /**
     * 初始 source container 建造任务
     */
    [WorkTaskType.BuildContainer]: RoomTask<WorkTaskType.BuildContainer> & {
        /**
         * 修建哪个 source 的 container
         * 会自己去找这个 source 周边的 container 工地去修
         */
        sourceId: Id<Source>
        /**
         * 要修建的 container，执行任务时由 creep 自己储存
         */
        containerId?: Id<StructureContainer>
    } & TaskCacheMemory
    /**
     * 维修任务
     */
    [WorkTaskType.Repair]: RoomTask<WorkTaskType.Repair> & {
        /**
         * 要维修的建筑 id
         */
        targetId?: Id<AnyStructure>
    } & TaskCacheMemory
    /**
     * 刷墙任务
     */
    [WorkTaskType.FillWall]: RoomTask<WorkTaskType.FillWall> & TaskCacheMemory
}

export interface WorkerMemory {
    /**
     * 工作单位要支援哪个房间
     */
    supportRoomName?: string
}

export type WorkerActionStrategy<T extends WorkTaskType = WorkTaskType> = {
    source: WorkerActionStage<T>
    target: WorkerActionStage<T>
}

type WorkerActionStage<T extends WorkTaskType> = (
    creep: Creep,
    task: WorkTasks[T],
    workRoom: Room
) => boolean

export type WorkerGetEnergy = (creep: Creep, memory: TaskCacheMemory, workRoom: Room) => boolean
