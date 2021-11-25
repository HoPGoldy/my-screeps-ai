/**
 * 跨 shard 通讯模块
 * 本模块会发起和处理 shard 之间的需求任务，详情见文档：
 * @see 跨shard设计案.md
 */

import { ALL_SHARD_NAME, Color, log } from '@/utils'
import { AppLifecycleCallbacks } from '../framework/types'
import requestHandleStrategies, { assertCreepMemory } from './handleStrategies'

// 其他 shard 的数据
const otherShardData: { [shard in ShardName]?: InterShardData } = {}

// 本 shard 的数据
let selfData: InterShardData = {}

// 自己的 shard 名称
const selfShardName: ShardName = Game.shard.name as ShardName

/**
 * 工作入口 - 检查并处理其他 shard 的消息
 *
 * 静默状态（完全没有跨 shard 信息）下的基础消耗为 0.03 - 0.01
 */
export const execShard = function () {
    // 私服不存在该属性
    // @ts-ignore
    if (!global.InterShardMemory) return ERR_NOT_FOUND

    initShardData()
    handleSelfMessage()
    handleOtherMessage()
}

/**
 * 从 InterShardMemory 初始化消息
 */
const initShardData = function () {
    // 获取所有 shard 的 InterShardMemory
    ALL_SHARD_NAME.forEach(name => {
        // 缓存消失时才会重新获取
        if (selfShardName === name && selfData) {
            selfData = JSON.parse(InterShardMemory.getLocal()) || {}
            return
        }

        // 重建其他 shard 的数据
        otherShardData[name] = JSON.parse(InterShardMemory.getRemote(name)) || {}
    })
}

/**
 * 检查自身消息
 * 确定自身发布的请求或者响应是否可以关闭
 */
const handleSelfMessage = function () {
    // 针对自己负责的消息进行处理
    for (const msgName in selfData) {
        // 如果消息是响应
        if (isReply(msgName)) {
            const requestInfo = getRequestInfo(msgName)

            // 自己已经响应了但是请求还在，为了避免之后 handleRequest 重复执行该请求，这里将其移除掉（并没有修改原始请求，下个 tick 依旧会正常重建）
            if (requestInfo.name in otherShardData[requestInfo.source]) {
                delete otherShardData[requestInfo.source][requestInfo.name]
            }
            // 如果请求已经被移除的话说明目标 shard 察觉到自己的响应了，所以直接把响应移除即可
            else {
                delete selfData[msgName]
                Game._needSaveInterShardData = true
            }
        }
        // 如果消息是请求
        else {
            // 请求有响应了就直接移除该请求
            const reply = checkReply(selfShardName, msgName, selfData[msgName])
            if (reply.has) {
                delete selfData[msgName]
                Game._needSaveInterShardData = true
            }
        }
    }
}

/**
 * 处理其他 shard 的请求
 */
const handleOtherMessage = function () {
    // 遍历所有 shard 搜索需要处理的请求
    for (const shardName in otherShardData) {
        // 遍历该 shard 的所有消息
        for (const msgName in otherShardData[shardName]) {
            // 该信息是响应
            if (isReply(msgName)) {
                const { source, name: requestName } = getRequestInfo(msgName)

                // 如果是自己请求的响应的话，关闭对应请求
                if (source === selfShardName) {
                    delete selfData[requestName]
                    Game._needSaveInterShardData = true
                }
            }
            // 该信息是请求
            else {
                const request: CrossShardRequest = otherShardData[shardName][msgName]

                if (request.to === selfShardName) {
                    if (!request.type || !requestHandleStrategies[request.type]) return log(`未知跨 shard 请求，不予执行 ${request.type}`, '跨 shard', Color.Yellow)

                    // 执行请求并作出回应
                    const result = requestHandleStrategies[request.type](request.data)
                    reply(msgName, shardName as ShardName, result)
                }
            }
        }
    }
}

/**
 * 检查一个消息是否为响应
 *
 * @param msgName 消息名称
 * @returns 是否为响应
 */
const isReply = function (msgName: string): boolean {
    return msgName.startsWith('shard')
}

/**
 * 解析该响应对应的请求信息
 *
 * @param replyName 响应的名字
 */
const getRequestInfo = function (replyName: string): CrossShardRequestInfo {
    // 我们规定使用响应的名称为 请求shard名:请求名，所以分隔后就可以取出对应的值
    const [source, name] = replyName.split(':')

    // 检查目标 shard 是否存在该请求
    return { source: source as ShardName, name }
}

/**
 * 检查某个请求是否有对应的响应
 *
 * @param sourceShard 请求来自于哪个 shard
 * @param requestName 请求名
 * @param request 请求信息
 * @returns 该请求的回应信息
 */
const checkReply = function (sourceShard: ShardName, requestName: string, request: CrossShardRequest): CrossShardReply {
    // 尝试从目标 shard 获取响应
    const reply = otherShardData[request.to][getReplyName(requestName, sourceShard)]

    // 返回响应结果
    return {
        has: reply !== undefined && reply !== null,
        result: reply as ScreepsReturnCode
    }
}

/**
 * 获取指定请求的响应名称
 *
 * @param request 要获取响应名的请求
 */
const getReplyName = function (requestName: string, sourceShard: ShardName): string {
    return `${sourceShard}:${requestName}`
}

/**
 * 响应请求
 *
 * @param requestName 请求名
 * @param sourceShard 请求的发起 shard
 * @param result 请求处理结果
 */
const reply = function (requestName: string, sourceShard: ShardName, result: ScreepsReturnCode) {
    const replyName = getReplyName(requestName, sourceShard)

    // 暂存数据，等待 tick 结尾统一保存
    selfData[replyName] = result
    Game._needSaveInterShardData = true
}

/**
 * 保存消息到 InterShardMemory
 *
 * @param msgName 消息名称
 * @param msgContent 消息内容
 */
export const saveShardData = function () {
    if (!Game._needSaveInterShardData) return
    // 需要保存时再执行保存
    InterShardMemory.setLocal(JSON.stringify(selfData))
}

/**
 * 发布新的跨 shard 请求
 *
 * @param name 请求的名字，要保证唯一性
 * @param to 要发送到的 shard 名称
 * @param type 跨 shard 请求的类型
 * @param data 跨 shard 请求携带的数据
 */
export const addCrossShardRequest = function <K extends CrossShardRequestType> (
    name: string,
    to: ShardName,
    type: K,
    data: CrossShardDatas[K]
) {
    selfData[name] = { to, type, data }
    Game._needSaveInterShardData = true
}

/**
 * 从跨 shard 内存暂存区取出 creep 内存
 *
 * 会直接把 creep 内存放到 Memory.creeps 里
 *
 * @param creepName 要取出内存的 creep 名字
 */
export const getMemoryFromCrossShard = function (creepName: string): CreepMemory {
    if (!Memory.crossShardCreeps) return undefined

    // 取出并清空暂存区
    const creepMemory = Memory.crossShardCreeps[creepName]
    delete Memory.crossShardCreeps[creepName]

    // 返回并设置到 Memory.creeps
    if (!Memory.creeps) Memory.creeps = {}
    if (assertCreepMemory(creepMemory)) {
        Memory.creeps[creepName] = creepMemory
    }
}

/**
 * 跨 shard 模块注册插件
 */
export const crossShardAppPlugin: AppLifecycleCallbacks = {
    tickStart: execShard,
    tickEnd: saveShardData
}
