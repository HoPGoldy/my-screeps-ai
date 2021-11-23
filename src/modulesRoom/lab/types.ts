export enum LabState {
    GetTarget = 'getTarget',
    GetResource = 'getResource',
    Working = 'working',
    PutResource = 'putResource'
}

export enum BoostState {
    GetLab = 'getLab',
    GetEnergy = 'getEnergy',
    GetResource = 'getResource',
    WaitBoost = 'waitBoost',
    ClearResource = 'clearResource'
}

/**
 * lab 的当前类别
 */
export enum LabType {
    /**
     * 底物存放 lab
     */
    Base = 1,
    /**
     * 反应执行 lab
     */
    Reaction,
    /**
     * 强化执行 lab
     */
    Boost
}

/**
 * lab 集群所需的信息
 * @see doc/lab设计案
 */
export interface LabMemory {
    /**
     * 合成进程状态
     */
    reactionState?: LabState
    /**
     * 强化进程状态
     */
    boostState?: BoostState
    /**
     * 当前生产的目标产物索引
     */
    reactionIndex?: number
    /**
     * 当前要生产的数量
     */
    reactionAmount?: number
    /**
     * 底物存放 lab 的 id
     */
    inLab?: [Id<StructureLab>, Id<StructureLab>]
    /**
     * 反应进行后下次反应进行的时间，值为 Game.time + cooldown
     */
    cooldownTime?: number
    /**
     * lab 是否暂停运行
     */
    pause?: boolean
    /**
     * 该房间存在的强化任务
     */
    boostTasks: BoostTask[]
    /**
     * 强化清单
     * 用于临时保存某个 creep 的强化进度
     * （因为一个 tick 可能无法执行完所有的强化，所以需要有个地方保存哪个 lab 强化了哪个没强化）
     * 可以将其理解为一个 creep 的体检清单
     */
    boostingNote: {
        /**
         * 被强化的 creep 名称
         */
        [creepName: string]: {
            /**
             * 要执行强化的 lab id
             */
            labId: Id<StructureLab>
            /**
             * 这个 lab 是否已经强化过了
             */
            boosted: boolean
        }[]
    }
}

/**
 * 强化任务
 */
export interface BoostTask {
    /**
     * 强化任务的材料清单
     */
    res: (BoostResourceConfig & {
        /**
         * 分配给该资源的存放 lab
         */
        lab?: Id<StructureLab>
    })[]
    /**
     * 该强化任务的唯一索引
     */
    id: number
    /**
     * 该强化任务的进度
     */
    state: BoostState
}

/**
 * 强化任务的材料清单
 */
export interface BoostResourceConfig {
    /**
     * 强化材料类型
     */
    resource: MineralBoostConstant
    /**
     * 强化材料数量
     */
    amount: number
}

/**
 * 反应底物表接口
 */
export interface ReactionSource {
    [targetResourceName: string]: (MineralConstant | MineralCompoundConstant)[]
}

/**
 * lab 合成目标
 */
export interface LabTarget {
    /**
     * 要合成的化合物
     */
    target: MineralCompoundConstant
    /**
     * 要合成的数量
     */
    number: number
}

declare global {
    interface Room {
        /**
         * 该房间是否已经执行过 lab 集群作业了
         * 在 Lab.work 中调用，一个房间只会执行一次
         */
        _hasRunLab: boolean
        /**
         * 该房间是否运行过 boost 作业了
         */
        _hasRunBoost: boolean
    }
    interface RoomMemory {
        /**
         * lab 内存
         */
        lab: LabMemory
    }
}
