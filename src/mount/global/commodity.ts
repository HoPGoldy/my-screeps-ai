import { Color, colorful, createRoomLink } from '@/modulesGlobal'
import { TOP_TARGET } from '@/modulesRoom/factory/constant'
import { FactoryLevel } from '@/modulesRoom/factory/types'

export default function(): string {
    if (!Memory.commodities) return '未启动商品生产线'

    let statsStr = [ ]
    // 遍历所有等级的房间
    for (const level in Memory.commodities) {
        statsStr.push(`[${level} 级工厂]`)
        const nodeNames = Memory.commodities[level]
        if (nodeNames.length <= 0) {
            statsStr.push('    - 无')
            continue
        }

        // 遍历所有房间
        // 这里返回的是筛选过的房间名
        // 所有访问不到的房间会被替换成 false
        const currentRoomNames = nodeNames.map(roomName => {
            if (!Game.rooms[roomName] || !Game.rooms[roomName].factory) {
                statsStr.push(`    - [${roomName}] 房间无视野或无工厂，已移除`)
                return false
            }

            statsStr.push(getRoomFactoryState(Game.rooms[roomName]))
            return roomName
        })

        // 剔除所有 false 并回填
        Memory.commodities[level] = currentRoomNames.filter(roomName => !_.isUndefined(roomName))
    }

    return statsStr.join('\n')
}

/**
 * 获取指定房间的工厂状态
 * 获取的信息包括：
 * 顶级产物数量，当前状态，任务数量，当前任务信息
 * 
 * @param room 要获取工厂状态的房间
 */
 function getRoomFactoryState(room: Room): string {
    const memory = room.memory.factory
    // 给房间名添加跳转链接
    const prefix = colorful(`  - [${createRoomLink(room.name)}] `, null, true)

    if (!memory) return prefix + `工厂未设置等级`
    if (!memory.depositTypes) return prefix + `工厂未设置生产线`

    const workStats = memory.pause ? colorful('暂停中', Color.Yellow) :
        memory.sleep ? colorful(`${memory.sleepReason} 休眠中 剩余${memory.sleep - Game.time}t`, Color.Yellow) : colorful('工作中', Color.Green)

    // 基本信息
    let logs = [ 
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
        const topResource = _.flatten(memory.depositTypes.map<string[]>(type => {
            return TOP_TARGET[type][memory.level].map<string>(res => `${res}*${room.terminal.store[res]}`)
        }))
        logs.push('[产物数量]', ...topResource)
    }
    else logs.push('异常!未发现终端')

    // 组装统计信息
    return logs.join(' ')
}

declare global {
    interface Memory {
        /**
         * 商品生产线配置
         * 键为工厂等级，值为被设置成对应等级的工厂所在房间名
         */
        commodities: {
            [level in FactoryLevel]: string[]
        }
    }
}