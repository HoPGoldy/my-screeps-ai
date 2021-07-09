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
