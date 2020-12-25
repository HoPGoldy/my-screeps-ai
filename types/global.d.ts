declare module NodeJS {
    interface Global {
        InterShardMemory: InterShardMemory
    }
}

/**
 * Game 对象拓展
 */
interface Game {
    /**
     * 本 tick 是否需要执行保存 InterShardMemory
     */
    _needSaveInterShardData: boolean
}

type AnyObject = { [key: string]: any }

/**
 * 当 creep 不需要生成时 mySpawnCreep 返回的值
 */
type CREEP_DONT_NEED_SPAWN = -101

/**
 * spawn.mySpawnCreep 方法的返回值集合
 */
type MySpawnReturnCode = ScreepsReturnCode | CREEP_DONT_NEED_SPAWN

/**
 * 本项目中出现的颜色常量
 */
type Colors = 'green' | 'blue' | 'yellow' | 'red'

/**
 * creep 能从中获取能量的建筑
 */
type EnergySourceStructure = StructureLink | StructureContainer | StructureTerminal | StructureStorage

/**
 * 所有能量来源
 * 
 * creep 将会从这些地方获取能量
 */
type AllEnergySource = Source | EnergySourceStructure

/**
 * 包含 store 属性的建筑
 */
type StructureWithStore = StructureTower | StructureStorage | StructureContainer | StructureExtension | StructureFactory | StructureSpawn | StructurePowerSpawn | StructureLink | StructureTerminal | StructureNuker

/**
 * 核心建筑群包含的建筑
 */
type CenterStructures = STRUCTURE_STORAGE | STRUCTURE_TERMINAL | STRUCTURE_FACTORY | 'centerLink'

/**
 * 从路径名到颜色的映射表
 */
interface IPathMap {
    [propName: string]: string
}
