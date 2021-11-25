import { red, createRoomLink } from '@/utils'

// 查看当前启用的 powerSpawn 工作状态
export default function (): string {
    if (!Memory.psRooms || Memory.psRooms.length <= 0) return '没有正在工作的 powerSpawn，在 powerSpawn 对象实例上执行 .on() 方法来进行激活。'
    // 下面遍历是会把正常的房间名放在这里面
    const workingPowerSpawn = []

    // 遍历保存的所有房间，统计 ps 状态
    const stats = Memory.psRooms.map(roomName => {
        const room = Game.rooms[roomName]
        if (!room || !room.powerSpawn) return `${red('●', true)} ${createRoomLink(roomName)} 无法访问该房间中的 powerSpawn，已移除。`
        workingPowerSpawn.push(roomName)

        return room.powerSpawn.stats()
    }).join('\n')

    // 更新可用的房间名
    Memory.psRooms = workingPowerSpawn
    return stats
}

declare global {
    interface Memory {
        /**
         * 启动 powerSpawn 的房间名列表
         */
        psRooms: string[]
    }
}
