import { Color, colorful } from "@/modulesGlobal"

/**
 * 格式化输出当前的资源提供房间
 */
export const showResourceSource = function (): string {
    if (!Memory.resourceSourceMap) return '暂无房间注册资源共享协议'

    return Object.entries(Memory.resourceSourceMap).map((
        [resourceType, roomList]: [ResourceConstant, string[]]
    ) => {
        // 格式化房间名和其中资源数量
        const roomStats = roomList.map(roomName => {
            const room = Game.rooms[roomName]
            if (!room) return `[${roomName} ${colorful('无法访问', Color.Red)}]`

            const { total } = room.myStorage.getResource(resourceType)
            return `[${roomName} ${colorful(total.toString(), Color.Blue)}]`
        })
        return `[${colorful(resourceType, Color.Yellow, true)}] 提供者 ${roomStats.join(' ')}`
    }).join('\n')
}

/**
 * 共享任务的数量可能大于终端的当前可用容量
 * 这个方法会获取到可以发送的资源容量
 * 
 * @param amount 期望的发送数量
 * @param targetRoom 要发送到的目标房间
 * @param sourceRoom 要执行发送的房间
 * @param terminalFree 终端中的剩余空间
 * @param existResource 终端里已经存在的资源数量
 * @param existEnergy 终端里已经存在的能量数量（路费）
 */
export const getSendAmount = function (
    amount: number,
    targetRoom: string,
    sourceRoom: string,
    terminalFree: number,
    existResource: number,
    existEnergy: number
): { amount: number, cost: number } {
    const cost = Game.market.calcTransactionCost(amount, targetRoom, sourceRoom)
    // 需要从外边搬进来的资源数量
    const needTransferAmount = Math.max(amount - existResource, 0) + Math.max(cost - existEnergy, 0)
    if (needTransferAmount <= terminalFree) {
        console.log('getSendAmount 内部', needTransferAmount, terminalFree)
        return { amount, cost }
    }

    // 剩余空间不足，拒绝发送
    if (needTransferAmount > 0 && terminalFree <= 0) return { amount: 0, cost: 0 }

    // 二分之后递归尝试
    return getSendAmount(Math.floor(amount / 2), targetRoom, sourceRoom, terminalFree, existResource, existEnergy)
}