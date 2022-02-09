/**
 * 默认的工人角色名
 */
export const DEFAULT_ROLE_NAME = 'worker'

/**
 * 工作任务优先级
 */
export const WORK_TASK_PRIOIRY = {
    BUILD: 10,
    REPAIR: 9,
    UPGRADE: 8
}

/**
 * 能量获取速率到调整期望的 map
 * 能量获取速率越高，工人数量就越多
 *
 * @property {} rate 能量获取速率
 * @property {} expect 对应的期望
 */
export const WORK_PROPORTION_TO_EXPECT = [
    { rate: 10, expect: 2 },
    { rate: 5, expect: 1 },
    { rate: 0, expect: 1 },
    { rate: -5, expect: -1 },
    { rate: -10, expect: -2 }
]
