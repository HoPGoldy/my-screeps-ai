import { createRoomLink } from '@/utils'
import { TOP_TARGET } from '../constants'
import { FactoryContext } from '../types'

/**
 * 显示全局的工厂配置及生产状态
 */
export const useGlobalShow = function (context: FactoryContext) {
    const { env, getMemory, getGlobalMemory, getFactory } = context
    const { bold, yellow, green } = env.colorful

    const showGlobal = function () {
        const globalConfig = getGlobalMemory()
        if (Object.keys(globalConfig).length <= 0) return '未启动商品生产线'

        const logs = []
        // 遍历所有等级的房间
        for (const level in globalConfig) {
            logs.push(`[${level} 级工厂]`)
            const nodeNames = globalConfig[level]
            if (nodeNames.length <= 0) {
                logs.push('    - 无')
                continue
            }

            // 遍历所有房间
            // 这里返回的是筛选过的房间名
            // 所有访问不到的房间会被替换成 false
            const currentRoomNames = nodeNames.map(roomName => {
                const room = env.getRoomByName(roomName)
                if (!room || !getFactory(room)) {
                    logs.push(`    - [${roomName}] 房间无视野或无工厂，已移除`)
                    return false
                }

                logs.push(getRoomFactoryState(room))
                return roomName
            })

            // 剔除所有 false 并回填
            globalConfig[level] = currentRoomNames.filter(roomName => !_.isUndefined(roomName))
        }

        return logs.join('\n')
    }

    /**
     * 获取指定房间的工厂状态
     * 获取的信息包括：
     * 顶级产物数量，当前状态，任务数量，当前任务信息
     *
     * @param room 要获取工厂状态的房间
     */
    const getRoomFactoryState = function (room: Room): string {
        const memory = getMemory(room)

        // 给房间名添加跳转链接
        const prefix = bold(`  - [${createRoomLink(room.name)}] `)

        if (!memory) return prefix + '工厂未设置等级'
        if (!memory.depositTypes) return prefix + '工厂未设置生产线'

        const workStats = memory.pause
            ? yellow('暂停中')
            : memory.sleep ? yellow(`${memory.sleepReason} 休眠中 剩余${memory.sleep - env.getGame().time}t`) : green('工作中')

        // 基本信息
        const logs = [
            prefix + workStats,
            `[当前状态] ${memory.state}`,
            `[任务数量] ${memory.taskList.length}`
        ]

        // 统计当前任务信息
        if (memory.taskList.length > 0) logs.push(`[任务目标] ${memory.taskList[0].target}*${memory.taskList[0].amount}`)
        // 如果有共享任务的话（有可能不属于工厂共享任务）
        if (room.memory.shareTask) {
            const share = room.memory.shareTask
            logs.push(`[共享任务] 目标 ${share.target} 资源 ${share.resourceType} 数量 ${share.amount}`)
        }

        // 统计顶级产物数量
        if (room.terminal) {
            const topResource = _.flatten(memory.depositTypes.map(type => {
                return TOP_TARGET[type][memory.level].map(res => `${res}*${room.terminal.store[res]}`)
            }))
            logs.push('[产物数量]', ...topResource)
        }
        else logs.push('异常!未发现终端')

        // 组装统计信息
        return logs.join(' ')
    }

    return showGlobal
}
