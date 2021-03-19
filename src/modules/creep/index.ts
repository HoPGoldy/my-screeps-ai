import { creepNumberListener } from './creepNumberListener'

export { creepNumberListener } from './creepNumberListener'
export { removeCreep, showCreep, hasCreep } from './utils'

/**
 * creep 数量控制模块注册插件
 */
export const creepNumberControlAppPlugin: AppLifecycleCallbacks = {
    tickStart: creepNumberListener,
}