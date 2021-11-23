import { CreepRole } from '@/role/types/role'

/**
 * 战斗小队的基础信息
 */
interface SquadBase<IN_MEMORY extends boolean> {
    /**
     * 是否准备就绪
     */
    ready: boolean
    /**
     * 小队路径
     */
    path: string
    /**
     * 小队前进方向
     */
    direction: DirectionConstant
    /**
     * 目标建筑
     */
    targetStructures: IN_MEMORY extends true ? Id<Structure>[] : Structure[]
    /***
     * 目标 creep
     */
    targetCreep: IN_MEMORY extends true ? Id<Creep | PowerCreep>[] : (Creep | PowerCreep)[]
}

/**
 * 小队内存
 */
export type SquadMemory = SquadBase<true>

/**
 * 小队中允许执行的战术动作
 * @type back 掉头，后队变前队
 * @type left 左转（逆时针）
 * @type right 右转（顺时针）
 * @type cross 对穿（左上到右下，右上到左下）
 */
export enum SquadTacticalActions {
    Back = 1,
    Left,
    Right,
    Corss
}

/**
 * 小队类型，要新增其他种类小队就在后面追加类型
 */
export enum SquadTypes {
    Apocalypse4 = 'apocalypse4',
}

/**
 * 小队的具体配置
 */
export interface SquadStrategy {
    /* 小队的组成，键为角色，值为需要的数量 */
    member: {
        [role in CreepRole]?: number
    }
    /***
     * 小队指令 - 治疗
     */
    heal: (squad: SquadMember, memory: SquadMemory) => any
    /***
     * 小队指令 - 攻击敌方单位
     */
    attackCreep: (squad: SquadMember, memory: SquadMemory) => any
    /***
     * 小队指令 - 攻击敌方建筑
     */
    attackStructure: (squad: SquadMember, memory: SquadMemory) => any
    /***
     * 寻路回调，在小队 getPath 中 PathFinder 的 roomCallback 中调用，用于添加小队自定义 cost
     */
    findPathCallback?: (roomName: string, costs: CostMatrix) => CostMatrix
    /***
     * 决定移动策略，参数是三个小队指令的返回值，返回是否继续前进（为 false 则后撤）
     */
    getMoveStrategy?: (healResult: any, attackCreepResult: any, attackStructureResult: any) => boolean
}

/**
 * 小队成员对象，键为小队成员在小队内存中的键，值为其本人，常用作参数
 */
export interface SquadMember {
    [memberName: string]: Creep
}
