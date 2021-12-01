import { createDelayQueue } from '@/modulesGlobal/delayQueue/creator'
import { DelayQueueMemory } from '@/modulesGlobal/delayQueue/types'
import { AppLifecycleCallbacks } from '@/modulesGlobal/framework/types'
import { createEnvContext } from '@/utils'

declare global {
    interface Memory {
        delays?: DelayQueueMemory
    }
}

const { manageDelayTask, withDelayCallback } = createDelayQueue({
    getMemory: () => {
        if (!Memory.delays) Memory.delays = {}
        return Memory.delays
    },
    env: createEnvContext('延迟任务')
})

/**
 * 延迟任务模块注册插件
 */
export const delayQueueAppPlugin: AppLifecycleCallbacks = {
    tickStart: manageDelayTask
}

export { withDelayCallback }
