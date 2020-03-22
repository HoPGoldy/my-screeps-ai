import { resourcesHelp, globalHelp, createHelp } from './utils'
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
    {
        alias: 'help',
        exec: function(): string {
            return globalHelp
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

    /**
     * 白名单控制 api
     * 挂载在全局，由玩家手动调用
     * 白名单仅应用于房间 tower 的防御目标，不会自动关闭 rempart，也不会因为进攻对象在白名单中而不攻击
     */
    whitelist: {
        /**
         * 添加用户到白名单
         * 重复添加会清空监控记录
         * 
         * @param userName 要加入白名单的用户名
         */
        add(userName: string): string {
            if (!Memory.whiteList) Memory.whiteList = {}
    
            Memory.whiteList[userName] = 0
    
            return `[白名单] 玩家 ${userName} 已加入白名单`
        },
    
        /**
         * 从白名单中移除玩家
         * 
         * @param userName 要移除的用户名
         */
        remove(userName: string): string {
            if (!(userName in Memory.whiteList)) return `[白名单] 该玩家未加入白名单`
    
            const enterTicks = Memory.whiteList[userName]
            delete Memory.whiteList[userName]
            // 如果玩家都删完了就直接移除白名单
            if (Object.keys(Memory.whiteList).length <= 0) delete Memory.whiteList
    
            return `[白名单] 玩家 ${userName} 已移出白名单，已记录的活跃时长为 ${enterTicks}`
        },
    
        /**
         * 显示所有白名单玩家及其活跃时长
         */
        show() {
            if (!Memory.whiteList) return `[白名单] 未发现玩家`
            const logs = [ `[白名单] 玩家名称 > 该玩家的单位在自己房间中的活跃总 tick 时长` ]
    
            // 绘制所有的白名单玩家信息
            logs.push(...Object.keys(Memory.whiteList).map(userName => `[${userName}] > ${Memory.whiteList[userName]}`))
    
            return logs.join('\n')
        },
    
        /**
         * 帮助
         */
        help() {
            return createHelp([
                {
                    title: '添加新玩家到白名单',
                    params: [
                        { name: 'userName', desc: '要加入白名单的用户名' }
                    ],
                    functionName: 'add'
                },
                {
                    title: '从白名单移除玩家',
                    params: [
                        { name: 'userName', desc: '要移除的用户名' }
                    ],
                    functionName: 'remove'
                },
                {
                    title: '列出所有白名单玩家',
                    functionName: 'show'
                }
            ])
        }
    },

    /**
     * 绕过房间 api
     * 用于配置在远程寻路时需要避开的房间，注意，该配置将影响所有角色，包括战斗角色。
     * 所以在进攻房间前请确保该房间不在本配置项中
     */
    bypass: {
        /**
         * 添加绕过房间
         * 
         * @param roomNames 要添加的绕过房间名列表
         */
        add(...roomNames: string[]): string {
            if (!Memory.bypassRooms) Memory.bypassRooms = []

            // 确保新增的房间名不会重复
            Memory.bypassRooms = _.uniq([ ...Memory.bypassRooms, ...roomNames])

            return `[bypass] 已添加绕过房间，${this.show()}`
        },

        /**
         * 移除绕过房间
         * 
         * @param roomNames 要移除的房间名列表
         */
        remove(...roomNames: string[]): string {
            if (!Memory.bypassRooms) Memory.bypassRooms = []

            // // 移除重复的房间
            Memory.bypassRooms = _.difference(Memory.bypassRooms, roomNames)

            return `[bypass] 已移除绕过房间，${this.show()}`
        },

        /**
         * 显示所有绕过房间
         */
        show(): string {
            if (!Memory.bypassRooms || Memory.bypassRooms.length <= 0) return `当前暂无绕过房间`
            return `当前绕过房间列表：${Memory.bypassRooms.join(' ')}`
        },

        /**
         * 帮助信息
         */
        help() {
            return createHelp([
                {
                    title: '添加绕过房间',
                    params: [
                        { name: '...roomNames', desc: '要添加的绕过房间名列表' }
                    ],
                    functionName: 'add'
                },
                {
                    title: '移除绕过房间',
                    params: [
                        { name: '...roomNames', desc: '要移除的房间名列表' }
                    ],
                    functionName: 'remove'
                },
                {
                    title: '显示所有绕过房间',
                    functionName: 'show'
                }
            ])
        }
    },

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
        `    - [${room.name}][${memory.pause ? '暂停中' : '运行中'}]`,
        `[当前状态] ${memory.state}`,
        `[任务数量] ${memory.taskList.length}`
    ]

    // 统计当前任务信息
    if (memory.taskList.length > 0) states.push(`[当前任务] ${memory.taskList[0].target} ${memory.taskList[0].amount}`)

    // 统计顶级产物数量
    if (room.terminal) states.push('[产物数量]', ...factoryTopTargets[memory.depositType][memory.level].map(res => {
        return `${res}*${room.terminal.store[res]}`
    }))
    else states.push('异常!未发现终端')

    // 组装统计信息
    return states.join(' ')
}