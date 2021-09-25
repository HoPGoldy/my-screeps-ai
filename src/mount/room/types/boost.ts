/**
 * 强化配置项
 * 详情 doc/boost 强化案
 */
interface BoostConfig {
    [resourceType: string]: number
}

/**
 * boost 任务阶段
 * 仅在房间的 LAB_STATE 为 boost 时有效
 * 
 * @type boostGet 获取资源, boost 进程的默认阶段
 * @type labGetEnergy 获取能量, 有 lab 能量不足时触发
 * @type waitBoost 等待强化，lab 在该阶段会一直等待直到 creep 调用强化
 * @type boostClear 清除资源，在强化完成后打扫 lab
 */
type BoostStats = 'boostGet' | 'labGetEnergy' | 'waitBoost' | 'boostClear'

/**
 * boost 资源配置类型
 * 
 * @type WAR 对外战争
 * @type DEFENSE 主动防御
 */
type BoostType = 'WAR' | 'DEFENSE'

/**
 * boost 资源配置表
 * 规定了不同模式下需要往 lab 装填的资源类型
 */
type BoostResourceConfig = {
    [type in BoostType]: ResourceConstant[]
}