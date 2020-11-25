/**
 * 所有的任务回调都会被存放到这里
 */
const taskCallbacks: { [taskName: string]: DelayTaskCallback } = {}

/**
 * 添加新的延迟任务
 * 
 * 当 Game.time 大于 callTime 时将触发通过 addDelayCallback 方法绑定的回调
 * 
 * @param name 要添加的任务名
 * @param data 该任务调用时接受的数据
 * @param callTime 任务的调用时间
 */
export const addDelayTask: AddDelayTask = function (name, data, callTime) {

}

/**
 * 添加延迟任务回调
 * 
 * 需要在 loop 之外调用（在任务触发前添加好对应的任务回调即可）
 * 
 * @param name 要分配回调的任务名
 * @param callback 任务触发时要执行的回调
 */
export const addDelayCallback: AddDelayCallback = function (name, callback) {

}

/**
 * 管理延迟任务
 * 
 * 必须在 loop 中调用该方法，不然无法正常触发回调
 */
export const manageDelayTask = function (): void {

}
