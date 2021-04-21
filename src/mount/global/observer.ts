import { colorful, createRoomLink } from "@/utils"

/**
 * 查看所有 observer 的运行状态
 */
export default function(): string {
    // 获取旗帜所在房间的访问链接
    const getFlagRoomLink = flagName => createRoomLink(Game.flags[flagName].pos.roomName)

    const stats = Object.values(Game.rooms).map(room => {
        if (!room.observer) return false

        const memory = room.memory.observer
        const obName = createRoomLink(room.name)
        if (!memory) return `${colorful('●', 'red', true)} ${obName} 未启用`
        if (memory.pause) return `${colorful('●', 'yellow', true)} ${obName} 暂停中`

        // 更新旗帜列表，保证显示最新数据
        room.observer.updateFlagList()

        // 正在采集的两种资源数量
        const pbNumber = memory.pbList.length
        const depoNumber = memory.depoList.length
        // 开采资源的所处房间
        const pbPos = memory.pbList.map(getFlagRoomLink).join(' ')
        const depoPos = memory.depoList.map(getFlagRoomLink).join(' ')

        let stats = [ colorful('●', 'green', true), obName ]
        stats.push(`[开采中 PB] ${pbNumber ? pbPos : '无'}`)
        stats.push(`[开采中 DEPO] ${depoNumber ? depoPos : '无'}`)

        return stats.join(' ')
    }).filter(Boolean).join('\n')

    return stats
}