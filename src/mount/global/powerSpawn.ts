// 查看当前启用的 powerSpawn 工作状态
export default function (): string {
    const logs = Object.values(Game.rooms).map(room => {
        if (!room || !room.powerSpawn) return false
        return room.psController.show()
    }).filter(Boolean)

    if (logs.length <= 0) return '暂未找到 powerSpawn'
    return logs.join('\n')
}
