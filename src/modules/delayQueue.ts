/**
 * 延迟任务模块
 * 
 * 某些任务需要在未来执行，例如一万 tick 后检查下 storage 能量还有多少，或者 mineral 采空之后需要等矿恢复好后再采集
 * 本模块就是用于处理这些需求，流程如下：
 * 
 * - 在 loop 循环里（任意位置）调用 manageDelayTask 来管理并触发这些延迟任务
 * - 通过 addDelayCallback 给指定的任务绑定回调
 * - 通过 addDelayTask 发布任务并指定触发时间
 */

/**
 * 所有的任务回调都会被存放到这里
 */
const taskCallbacks: { [taskName in AllDelayTaskName]?: DelayTaskCallback<AllDelayTaskName> } = {}

/**
 * 添加新的延迟任务
 * 
 * 当 Game.time 大于 callTime 时将触发通过 addDelayCallback 方法绑定的回调
 * 
 * @param name 要添加的任务名
 * @param data 该任务调用时接受的数据
 * @param callTime 任务的调用时间（Game.time）
 */
export const addDelayTask = function <K extends AllDelayTaskName>(
    name: K,
    data: DelayTaskTypes[K],
    call: number
): void {
    Memory.delayTasks.push({ call, data: serializeTask(name, data) })
}

/**
 * 添加延迟任务回调
 * 
 * 需要在 loop 之外调用（在任务触发前添加好对应的任务回调即可）
 * 新添加的回调会覆盖旧的回调
 * 
 * @param name 要分配回调的任务名
 * @param callback 任务触发时要执行的回调
 */
export const addDelayCallback = function <K extends AllDelayTaskName>(
    name: K,
    callback: DelayTaskCallback<K>
): void {
    taskCallbacks[name] = callback
}

/**
 * 管理延迟任务
 * 
 * 用于执行那些需要在指定时间才会触发的任务
 * 必须在 loop 中调用该方法，不然无法正常触发回调
 */
export const manageDelayTask = function (): void {
    // 用 filter 更新所有还没有执行的任务
    Memory.delayTasks = Memory.delayTasks.filter(task => {
        if (Game.time < task.call) return true

        // 解析任务，如果已经注册了回调的话就执行
        const [ taskName, taskData ] = unserializeTask(task.data)
        if (!(taskName in taskCallbacks)) return true

        // 这里不会判断房间是否存在，这个判断下放给回调逻辑
        taskCallbacks[taskName](Game.rooms[taskData.roomName], taskData)

        // 执行完成，剔除任务
        return false
    })
}

/**
 * 将任务压缩为字符串
 * 
 * 因为任务可能在很久之后才会被使用，并且只会使用一次
 * 所以在存储时会将其压缩成字符串以减少 Memory 解析成本
 * 
 * @param name 任务名
 * @param data 任务数据
 */
const serializeTask = function <K extends AllDelayTaskName>(
    name: K,
    data: DelayTaskTypes[K]
): string {
    return `${name} ${JSON.stringify(data)}`
}

/**
 * 将压缩的字符串还原为任务名和任务数据
 * 
 * @param taskString 被 serializeTask 压缩的任务字符串
 */
const unserializeTask = function (taskString: string): [ AllDelayTaskName, DelayTaskTypes[AllDelayTaskName] ] {
    const [ name, ...tasks ] = taskString.split(' ')
    return [ name as AllDelayTaskName, JSON.parse(tasks.join(' '))]
}