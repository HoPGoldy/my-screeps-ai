import { CreepRole } from '@/role/types/role'
import { AllowCrossRuleFunc, CrossRules } from './types'

/**
 * creep 是否在站定不动
 *
 * 键为 creep 的名字，值为该 creep 是否站定不动
 */
const creepStandInfo: Record<string, boolean> = {}

/**
 * 获取指定 creep 当前是否为站定状态
 */
export const isCreepStand = function (creepName: string) {
    return !!creepStandInfo[creepName]
}

/**
 * 将设置指定 creep 的站定状态
 */
export const setCreepStand = function (creepName: string, isStanding: boolean): void {
    if (isStanding) isCreepStand[creepName] = true
    else delete isCreepStand[creepName]
}

/**
 * 默认的对穿规则
 *
 * 当自己正在站定工作，并且请求对穿的和自己是相同角色时拒绝对穿
 *
 * @param creep 被对穿的 creep
 * @param requireCreep 发起对穿的 creep
 */
const defaultRule: AllowCrossRuleFunc = (creep, requireCreep) => !(isCreepStand[creep.name] && requireCreep.memory.role === creep.memory.role)

/**
 * 站定时不允许对穿
 * @param creep 被对穿的 creep
 */
const noCrossWithStanding: AllowCrossRuleFunc = creep => !isCreepStand[creep.name]

/**
 * 对穿规则合集
 *
 * 返回值代表了 creep 是否允许 requireCreep 对穿
 */
const crossRules: CrossRules = {
    // 【默认规则】自己在工作时有同角色 creep 发起对穿则拒绝对穿
    default: defaultRule,

    // 填充单位无论什么时候都会允许对穿，因为其不会长时间停在一个位置上工作
    [CreepRole.Manager]: () => true,

    // 采集单位在采集能量时不允许对穿
    [CreepRole.Harvester]: noCrossWithStanding,

    // pb 治疗单位正在治疗时不允许其他治疗单位对穿
    [CreepRole.PbHealer]: noCrossWithStanding,

    [CreepRole.RemoteBuilder]: noCrossWithStanding,
    [CreepRole.RemoteHarvester]: noCrossWithStanding
}

export default crossRules
