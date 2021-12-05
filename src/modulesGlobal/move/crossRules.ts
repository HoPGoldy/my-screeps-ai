import { CreepRole } from '@/role/types/role'
import { AllowCrossRuleFunc, CrossRules } from './types'

/**
 * 默认的对穿规则
 *
 * 当自己正在站定工作，并且请求对穿的和自己是相同角色时拒绝对穿
 *
 * @param creep 被对穿的 creep
 * @param requireCreep 发起对穿的 creep
 */
const defaultRule: AllowCrossRuleFunc = (creep, requireCreep) => !(creep.memory.stand && requireCreep.memory.role === creep.memory.role)

/**
 * 站定时不允许对穿
 * @param creep 被对穿的 creep
 */
const noCrossWithStanding: AllowCrossRuleFunc = creep => !creep.memory.stand

/**
 * 工作时不允许对穿
 * @param creep 被对穿的 creep
 */
const noCrossWithWorking: AllowCrossRuleFunc = creep => !creep.memory.working

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
    [CreepRole.PbHealer]: (creep, requireCreep) => {
        if (creep.memory.role !== requireCreep.memory.role) return true
        return creep.memory.working !== requireCreep.memory.working
    },

    [CreepRole.RemoteBuilder]: noCrossWithStanding,
    [CreepRole.RemoteHarvester]: noCrossWithStanding
}

export default crossRules
