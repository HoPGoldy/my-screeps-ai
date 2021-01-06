/**
 * 简写版本的 bodyPart[]，格式如下：
 * 
 * @example { [TOUGH]: 3, [WORK]: 4, [MOVE]: 7 }
 */
interface BodySet {
    [MOVE]?: number
    [CARRY]?: number
    [ATTACK]?: number
    [RANGED_ATTACK]?: number
    [WORK]?: number
    [CLAIM]?: number
    [TOUGH]?: number
    [HEAL]?: number
}

/**
 * 单个角色类型的身体部件配置
 * 其键代表房间的 energyAvailable 属性
 * 300 就代表房间能量为 0 ~ 300 时应该使用的身体部件，该区间前开后闭
 * 例如：房间的 energyAvailable 为 600，则就会去使用 800 的身体部件，
 */
type BodyConfig = {
    [energyLevel in 300 | 550 | 800 | 1300 | 1800 | 2300 | 5600 | 10000 ]: BodyPartConstant[]
}

/**
 * 身体配置项类别
 * 包含了所有角色类型的身体配置
 */
type BodyConfigs = {
    [type in BodyAutoConfigConstant]: BodyConfig
}

/**
 * 身体部件生成函数
 * 接受房间和要执行孵化的 spawn 信息，返回可以生成的身体部件数组
 */
type BodyPartGenerator = (room: Room, spawn: StructureSpawn) => BodyPartConstant[]