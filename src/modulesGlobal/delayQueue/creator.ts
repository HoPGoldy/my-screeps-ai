import { errorMapper } from '@/modulesGlobal/framework/errorMapper'
import { createMemoryAccessor } from './memory'
import { DelayQueueContext, DelayTask, DelayCallback } from './types'

export const createDelayQueue = function (context: DelayQueueContext) {
    const { env, getMemory } = context
    const db = createMemoryAccessor(getMemory)

    /**
     * 所有的任务回调都会被存放到这里
     */
    const taskCallbacks: { [taskType: string]: DelayCallback } = {}

    /**
     * 执行指定延迟任务
     *
     * @param param0 要执行的任务数据
     */
    const execDelayTask = function ({ type, data }: DelayTask) {
        if (!(type in taskCallbacks)) {
            env.log.warning(`找不到要触发的回调 ${name}，任务数据 ${data}`)
            return
        }

        errorMapper(taskCallbacks[type], data)
    }

    /**
     * 注册延迟任务回调
     *
     * **会返回一个函数，可以使用该函数来添加对应回调的延迟任务**
     *
     * 需要在 loop 之外调用（在任务触发前添加好对应的任务回调即可）
     * 新添加的回调会覆盖旧的回调
     *
     * @param type 要分配回调的任务名
     * @param callback 任务触发时要执行的回调
     */
    const withDelayCallback = function <T extends Record<string, any>> (type: string, delayCallback: (data: T) => unknown) {
        taskCallbacks[type] = delayCallback

        /**
         * 添加新的延迟任务
         * call tick 后将触发通过对应 withDelayCallback 方法绑定的回调
         *
         * @param data 该任务调用时接受的数据
         * @param call 任务在多少 tick 后调用
         */
        const addDelayTask = function (data: T, call: number) {
            const currentTick = env.getGame().time
            const callTick = currentTick + call
            // 不能添加过去的延迟任务
            if (callTick < currentTick) return
            // 当前 tick 的任务，直接触发
            else if (callTick === currentTick) {
                execDelayTask({ type, data })
                return
            }

            // 保存起来供后面调用
            db.insertTaskWithTick(callTick, type, data)
        }

        return addDelayTask
    }

    /**
     * 管理延迟任务
     *
     * 用于执行那些需要在指定时间才会触发的任务
     * 必须在 loop 中调用该方法，不然无法正常触发回调
     */
    const manageDelayTask = function (): void {
        const currentTick = env.getGame().time
        const thisTickTask = db.queryTaskByTick(currentTick)
        // 本 tick 没有延迟任务，跳过
        if (thisTickTask.length <= 0) return

        // 执行并移除本 tick 的延迟任务
        thisTickTask.map(execDelayTask)
        db.deleteTaskByTick(currentTick)
    }

    return { withDelayCallback, manageDelayTask }
}

/**
 * 延迟任务创建器
 * 给该方法传入一个延迟任务回调，即可返回一个用于发布延迟任务的函数
 */
export type WithDelayCallback = ReturnType<typeof createDelayQueue>['withDelayCallback']
