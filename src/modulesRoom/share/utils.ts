import { colorful } from "@/utils"

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
            if (!room) return `[${roomName} ${colorful('无法访问', 'red')}]`

            const resourceAmount = room.myStorage.getResource(resourceType)
            return `[${roomName} ${colorful(resourceAmount.toString(), 'blue')}]`
        })
        return `[${colorful(resourceType, 'yellow', true)}] 提供者 ${roomStats.join(' ')}`
    }).join('\n')
}

/**
 * 共享任务的数量可能大于终端的当前可用容量
 * 这个方法会获取到可以发送的资源容量
 * 
 * @param task 要执行的共享任务
 */
export const getSendAmount = function (
    amount: number,
    targetRoom: string,
    res: ResourceConstant,
    terminalFree: number
): { amount: number, cost: number } {
    const cost = Game.market.calcTransactionCost(amount, targetRoom, res)
    if (amount + cost < terminalFree) return { amount, cost }

    return getSendAmount(amount / 2, targetRoom, res, terminalFree)
}