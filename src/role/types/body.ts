import { CreepRole } from './role'

/**
 * 单个角色类型的身体部件配置
 * 其键代表房间的 energyAvailable 属性
 * 300 就代表房间能量为 0 ~ 300 时应该使用的身体部件，该区间前开后闭
 * 例如：房间的 energyAvailable 为 600，则就会去使用 800 的身体部件，
 */
export type BodyConfig = {
    [energyLevel in 300 | 550 | 800 | 1300 | 1800 | 2300 | 5600 | 10000 ]: BodyPartConstant[]
}

/**
 * 包含身体部件自动调整的角色
 */
export type AutoBodyRole =
    CreepRole.Worker |
    CreepRole.Manager |
    CreepRole.Reserver |
    CreepRole.RemoteHarvester

/**
 * 身体配置项类别
 * 包含了所有角色类型的身体配置
 */
export type BodyConfigs = {
    [type in AutoBodyRole]: BodyConfig
}

/**
 * 身体部件生成函数
 * 接受房间和要执行孵化的 spawn 信息，返回可以生成的身体部件数组
 */
export type BodyPartGenerator = (room: Room, spawn: StructureSpawn) => BodyPartConstant[]
