import { resourcesHelp, whiteListApi } from './utils'
import { factoryTopTargets } from './setting'
import { creepApi } from './creepController'

// 挂载全局拓展
export default function () {
    // 挂载有别名的操作
    funcAlias.map(item => {
        Object.defineProperty(global, item.alias, { get: item.exec })
    })
    // 挂载没有别名的操作
    _.assign(global, globalExtension)
}

/**
 * 全局拓展的别名
 * 使用别名来方便在控制台执行方法
 * 
 * @property {string} alias 别名
 * @property {function} exec 执行别名时触发的操作
 */
const funcAlias = [
    // 常用的资源常量
    {
        alias: 'resource',
        exec: function(): string {
            return resourcesHelp
        }
    },
    // 释放所有禁止通行点位
    {
        alias: 'clearpos',
        exec: function(): string {
            Object.values(Game.rooms).map(room => {
                if (room.memory.restrictedPos) room.memory.restrictedPos = {}
            })
            return '禁止通行点位已释放'
        }
    },
    // 显示当前商品生产状态
    {
        alias: 'comm',
        exec: function(): string {
            if (!Memory.commodities) return '未启动商品生产线'

            let stateStr = [ ]
            // 遍历所有生产线
            for (const deopsitType in Memory.commodities) {
                stateStr.push(`[${deopsitType} 商品合成]`)

                // 遍历该生产线所有等级
                for (const level in Memory.commodities[deopsitType].node) {
                    stateStr.push(`  [${level} 级工厂]`)
                    const nodeNames = Memory.commodities[deopsitType].node[level]
                    if (nodeNames.length <= 0) {
                        stateStr.push('    - 无')
                        continue
                    }

                    // 遍历所有房间
                    // 这里返回的是筛选过的房间名
                    // 所有访问不到的房间会被替换成 false
                    const currentRoomNames = nodeNames.map(roomName => {
                        if (!Game.rooms[roomName] || !Game.rooms[roomName].factory) {
                            stateStr.push(`    - [${roomName}] 房间无视野或无工厂，已移除`)
                            return false
                        }

                        stateStr.push(getRoomFactoryState(Game.rooms[roomName]))
                    })

                    // 剔除所有 false 并回填
                    Memory.commodities[deopsitType][level] = currentRoomNames.filter(roomName => !_.isUndefined(roomName))
                }
            }

            return stateStr.join('\n')
        }
    },
    /**
     * 把房间挂载到全局
     * 来方便控制台操作，在访问时会实时的获取房间对象
     * 注意：仅会挂载 Memory.rooms 里有的房间
     */
    ...Object.keys(Memory.rooms).map(roomName => ({
        alias: roomName,
        exec: (): Room => Game.rooms[roomName]
    }))
]

// 全局拓展对象
export const globalExtension = {
    /**
     * Game.getObjectById 的别名
     * 
     * @param id 游戏对象的 id
     */
    get: function(id: string): any {
        return Game.getObjectById(id)
    },
    /**
     * Game.market.extendOrder 的别名
     * 
     * @param orderId 订单的 id
     * @param amount 要追加的数量
     */
    orderExtend: function(orderId: string, amount: number) {
        const actionResult = Game.market.extendOrder(orderId, amount)

        let returnString = ''
        if (actionResult === OK) returnString = '订单追加成功'
        else returnString = `订单追加失败，错误码 ${returnString}`

        return returnString
    },

    whitelist: whiteListApi,

    // 将 creepApi 挂载到全局方便手动发布或取消 creep
    creepApi
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
    if (!memory) return `    - [${room.name}] 工厂未设置等级`

    // 基本信息
    let states = [ 
        `    - [${room.name}]`,
        `[当前状态] ${memory.state}`,
        `[任务数量] ${memory.taskList.length}`,
        `[顶级产物]`
    ]

    // 统计顶级产物数量
    if (room.terminal) states.push(...factoryTopTargets[memory.depositType][memory.level].map(res => {
        return `${res}*${room.terminal.store[res]}`
    }))
    else states.push('异常!未发现终端')

    // 统计当前任务信息
    if (memory.taskList.length > 0) states.push(`[当前任务] ${memory.taskList[0].target} ${memory.taskList[0].amount}`)
    
    // 组装统计信息
    return states.join(' ')
}