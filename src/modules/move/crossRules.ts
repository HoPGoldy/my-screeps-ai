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
 * 简单对穿规则：工作时不允许对穿
 * 
 * @param creep 被对穿的 creep
 */
const noCrossWithWork: AllowCrossRuleFunc = creep => !creep.memory.stand


/**
 * 对穿规则合集
 * 
 * 返回值代表了 creep 是否允许 requireCreep 对穿
 */
const crossRules: CrossRules = {
    // 【默认规则】自己在工作时有同角色 creep 发起对穿则拒绝对穿
    default: defaultRule,

    // 填充单位无论什么时候都会允许对穿，因为其不会长时间停在一个位置上工作
    manager: () => true,

    // 中央处理单位在携带有资源时不允许对穿
    processor: creep => !creep.memory.working,

    // 工作单位在工作时不允许任何 creep 对穿
    // 其实对应的判断规则要复杂一点，例如执行 upgrade 任务时允许正在建造的工作对穿，但是不允许其他执行升级任务的单位对穿
    // 但是为了节省性能，这里直接一把梭，如果真有需求可以再添上
    worker: noCrossWithWork
}

export default crossRules