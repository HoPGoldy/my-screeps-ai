import { red, yellow, green, createRoomLink } from '@/utils'
import { ObserverContext } from '../types'

/**
 * 查看所有 observer 的运行状态
 */
export const useGlobalShow = function (
    context: ObserverContext,
    updateFlagList: (room: Room) => unknown
): () => string {
    const { env, getObserver, getMemory } = context

    return function () {
        // 获取旗帜所在房间的访问链接
        const getFlagRoomLink = flagName => createRoomLink(env.getFlagByName(flagName)?.pos.roomName)

        const stats = Object.values(env.getGame().rooms).map(room => {
            if (!getObserver(room)) return false

            const memory = getMemory(room)
            const obName = createRoomLink(room.name)
            if (!memory) return `${red('●', true)} ${obName} 未启用`
            if (memory.pause) return `${yellow('●', true)} ${obName} 暂停中`

            // 更新旗帜列表，保证显示最新数据
            updateFlagList(room)

            // 正在采集的两种资源数量
            const pbNumber = memory.pbList.length
            const depoNumber = memory.depoList.length
            // 开采资源的所处房间
            const pbPos = memory.pbList.map(getFlagRoomLink).join(' ')
            const depoPos = memory.depoList.map(getFlagRoomLink).join(' ')

            const stats = [green('●', true), obName]
            stats.push(`[开采中 PB] ${pbNumber ? pbPos : '无'}`)
            stats.push(`[开采中 DEPO] ${depoNumber ? depoPos : '无'}`)

            return stats.join(' ')
        }).filter(Boolean).join('\n')

        return stats
    }
}
