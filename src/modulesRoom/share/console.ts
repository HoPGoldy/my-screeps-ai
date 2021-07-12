/**
 * 资源共享模块的用户控制接口
 */
export default class ShareConsole extends Room {
    /**
     * 向指定房间发送资源
     * 
     * @param roomName 目标房间名
     * @param resourceType 要共享的资源类型
     * @param amount 要发送的数量, 默认 100k
     */
    public giver(roomName: string, resourceType: ResourceConstant, amount: number = 1000): string {
        // 检查资源是否足够
        if (!this.terminal) return `[资源共享] 该房间没有终端`

        const logs = []
        // 如果在执行其他任务则将其覆盖，因为相对于用户操作来说，其他模块发布的资源共享任务优先级肯定要低
        // 并且其他模块的共享任务就算被删除了，过一段时间之后它也会再次发布并重新添加
        if (this.memory.shareTask) {
            const task = this.memory.shareTask
            logs.push(`┖─ 因此移除的共享任务：目标房间：${task.target} 资源类型：${task.resourceType} 资源总量：${task.amount}`)
        }

        const { total } = this.myStorage.getResource(resourceType)
        if (! total || total < amount) return `[资源共享] 数量不足 ${resourceType} 剩余 ${total | 0}`

        // 计算路费，防止出现路费 + 资源超过终端上限的问题出现
        const cost = Game.market.calcTransactionCost(amount, this.name, roomName)
        if (amount + cost > TERMINAL_CAPACITY) {
            return `[资源共享] 添加共享任务失败，资源总量超出终端上限：发送数量(${amount}) + 路费(${cost}) = ${amount + cost}`
        }

        this.memory.shareTask = {
            target: roomName,
            amount,
            resourceType
        }

        logs.unshift(`[资源共享] 任务已添加，移交终端处理：房间名：${roomName} 共享数量：${amount} 路费：${cost}`)

        return logs.join('\n')
    }

    /**
     * 向指定房间发送能量
     * 该操作会自动从 storage 里取出能量
     * 
     * @param roomName 目标房间名
     * @param amount 要发送的数量, 默认 100k
     */
    public givee(roomName: string, amount: number = 100000): string {
        return this.giver(roomName, RESOURCE_ENERGY, amount)
    }

    /**
     * 向指定房间发送 power
     * 
     * @param roomName 要发送到的房间名
     * @param amount 发送的数量
     */
    public givep(roomName: string, amount: number = 5000) {
        return this.giver(roomName, RESOURCE_POWER, amount)
    }
}