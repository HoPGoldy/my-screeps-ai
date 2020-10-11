/**
 * 跨 shard 通讯模块
 * 本模块会发起和处理 shard 之间的需求任务，详情见文档：
 * @see 跨shard设计案.md
 */

import { ALL_SHARD_NAME } from 'setting'

export default class CrossShard {
    // 其他 shard 的数据
    private static otherShardData: { [shard in ShardName]?: InterShardData } = {}
    // 自己 shard 的数据
    private static selfData: InterShardData = {}

    /**
     * 工作入口 - 检查并处理其他 shard 的消息
     * 
     * 静默状态（完全没有跨 shard 信息）下的基础消耗为 0.03 - 0.01
     */
    static exec() {
        // 私服不存在该属性
        if (!global.InterShardMemory) return ERR_NOT_FOUND

        this.init().checkSelfMessage().handleRequest()

        return this
    }

    /**
     * 从 InterShardMemory 初始化消息
     */
    static init() {
        // 获取所有 shard 的 InterShardMemory
        ALL_SHARD_NAME.forEach(name => {
            // 缓存消失时才会重新获取
            if (Game.shard.name === name && !this.selfData) return this.selfData = JSON.parse(InterShardMemory.getLocal()) || {}

            // 重建其他 shard 的数据
            this.otherShardData[name] = JSON.parse(InterShardMemory.getRemote(name)) || {}
        })

        return this
    }

    /**
     * 检查自身消息
     * 确定自身发布的请求或者响应是否可以关闭
     */
    static checkSelfMessage() {
        // 针对自己负责的消息进行处理
        for (const msgName in this.selfData) {
            // 如果消息是响应
            if (this.isReply(msgName)) {
                const requestInfo = this.getRequestInfo(msgName)

                // 自己已经响应了但是请求还在，为了避免之后 handleRequest 重复执行该请求，这里将其移除掉（并没有修改原始请求）
                if (requestInfo.name in this.otherShardData[requestInfo.source]) {
                    delete this.otherShardData[requestInfo.source][requestInfo.name]
                }
                // 如果请求已经被移除的话说明目标 shard 察觉到自己的响应了，所以直接把响应移除即可
                else delete this.selfData[msgName]
            }
            // 如果消息是请求
            else {
                // 请求有响应了就直接移除该请求
                const reply = this.checkReply(msgName, this.selfData[msgName])
                if (reply.has) delete this.selfData[msgName]
            }
        }

        return this
    }

    /**
     * 发布新请求
     */
    static addRequest(name: string, to: ShardName, type: CrossShardRequestType, data: CrossShardRequestData) {
        this.selfData[name] = { to, type, data } as CrossShardRequest
        Game._needSaveInterShardData = true
    }

    /**
     * 处理其他 shard 的请求
     */
    static handleRequest() {
        // 遍历所有 shard 搜索需要处理的请求
        for (const shardName in this.otherShardData) {
            // 遍历该 shard 的所有消息
            for (const msgName in this.otherShardData[shardName]) {
                // 不处理 replay
                if (this.isReply(msgName)) continue

                const request: CrossShardRequest = this.otherShardData[shardName][msgName]
                // 执行请求并作出回应
                const result = requestHandleStrategies[request.type](request.data)
                this.reply(msgName, shardName as ShardName, result)
            }
        }

        return this
    }

    /**
     * 响应请求
     * 
     * @param requestName 请求名
     * @param sourceShard 请求的发起 shard
     * @param result 请求处理结果
     */
    static reply(requestName: string, sourceShard: ShardName, result: ScreepsReturnCode) {
        const replyName = this.getReplyName(requestName, sourceShard)

        // 暂存数据，等待 tick 结尾统一保存
        this.selfData[replyName] = result
        Game._needSaveInterShardData = true
    }

    /**
     * 保存消息到 InterShardMemory
     * 
     * @param msgName 消息名称
     * @param msgContent 消息内容
     */
    static save() {
        if (!Game._needSaveInterShardData) return
        // 需要保存时再执行保存
        InterShardMemory.setLocal(JSON.stringify(this.selfData))
    }

    /**
     * 检查一个消息是否为响应
     * 
     * @param msgName 消息名称
     * @returns 是否为响应
     */
    private static isReply(msgName: string): boolean {
        return msgName.startsWith('shard')
    }

    /**
     * 获取指定请求的响应名称
     * 
     * @param request 要获取响应名的请求
     */
    private static getReplyName(requestName: string, sourceShard: ShardName): string {
        return `${sourceShard}:${requestName}`
    }

    /**
     * 检查某个请求是否有对应的响应
     */
    private static checkReply(requestName: string, request: CrossShardRequest): CrossShardReply {
        // 尝试从目标 shard 获取响应
        const reply = this.otherShardData[request.to][this.getReplyName(requestName, request.to)]

        // 返回响应结果
        return {
            has: !!reply,
            result: reply as ScreepsReturnCode
        }
    }

    /**
     * 检查某个响应是否存在对应的请求
     * 
     * @param replyName 响应的名称
     * @returns true为存在请求，false 为不存在对应的请求
     */
    private static getRequestInfo(replyName: string): CrossShardRequestInfo {
        // 我们规定使用响应的名称为 请求shard名:请求名，所以分隔后就可以取出对应的值
        const [ source, name ] = replyName.split(':')

        // 检查目标 shard 是否存在该请求
        return { source: source as ShardName, name }
    }
}

/**
 * 请求的处理策略
 * 每种请求都必须存在对应的处理策略
 */
const requestHandleStrategies: CrossShardRequestStrategies = {
    /**
     * 发送 creep 到其他 shard
     */
    sendCreep: (data: SendCreepData) => {
        if (!Memory.creeps) Memory.creeps = {}

        // 把 creep 内存复制到自己 Memory 里
        Memory.creeps[data.name] = data.memory
        return OK
    }
}