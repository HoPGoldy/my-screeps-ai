import { errorMapper } from 'modules/errorMapper'

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
  * 延迟任务队列的数据保存在 Memory 下的哪个字段里
  */
const SAVE_KEY = 'delayTasks'

/**
 * 所有的任务回调都会被存放到这里
 */
const taskCallbacks: { [taskName in AllDelayTaskName]?: DelayTaskCallback<AllDelayTaskName> } = {}

/**
 * 所有的延迟任务存放处
 * 其键为触发的 Game.time，值为在该 tick 要触发的任务列表
 */
let delayTasks: { [callTime: number]: DelayTask[] } = {}

/**
 * 添加新的延迟任务
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
    // 不能添加过去的延迟任务
    if (call < Game.time) return
    // 当前 tick 的任务，直接触发
    else if (call == Game.time) execDelayTask({ name, data })

    // 保存到对应的队列里
    if (delayTasks[call]) delayTasks[call].push({ name, data })
    else delayTasks[call] = [{ name, data }]

    Game._needSaveDelayQueueData = true
}

/**
 * 从 Memory 中重建延迟任务
 * 需要在全局重置时调用
 */
export const initDelayTasks = function () {
    if (!Memory[SAVE_KEY]) return
    delayTasks = JSON.parse(Memory[SAVE_KEY])
}

/**
 * 把当前的延迟任务保存到 Memory 中
 */
export const saveDelayTasks = function () {
    if (!Game._needSaveDelayQueueData) return

    if (Object.keys(delayTasks).length <= 0) {
        delete Memory[SAVE_KEY]
        return
    }
    
    Memory[SAVE_KEY] = JSON.stringify(delayTasks)
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
    // 本 tick 没有延迟任务，跳过
    if (!(Game.time in delayTasks)) return

    // 执行本 tick 的延迟任务
    delayTasks[Game.time].map(execDelayTask)

    // 本 tick 的延迟任务执行完成，移除存储
    delete delayTasks[Game.time]
    Game._needSaveDelayQueueData = true
}

/**
 * 执行指定延迟任务
 * 
 * @param param0 要执行的任务数据
 */
const execDelayTask = function ({ name, data }: DelayTask) {
    errorMapper(() => {
        if (!(name in taskCallbacks)) return
        // 这里不会判断房间是否存在，这个判断下放给回调逻辑
        taskCallbacks[name](Game.rooms[data.roomName], data)
    })
}

/**
 * 延迟任务模块注册插件
 */
export const delayQueueAppPlugin: AppLifecycleCallbacks = {
    reset: initDelayTasks,
    afterWork: manageDelayTask,
    tickEnd: saveDelayTasks
}