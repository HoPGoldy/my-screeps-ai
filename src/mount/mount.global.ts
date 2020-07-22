import { colorful, createHelp, clearFlag, createRoomLink, createConst, createLink } from '../utils'
import { factoryTopTargets, baseLayout } from '../setting'
import { creepApi } from '../modules/creepController'
import { findBaseCenterPos } from '../modules/autoPlanning'

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
        alias: 'res',
        exec: function(): string {
            return resourcesHelp
        }
    },
    {
        alias: 'help',
        exec: function(): string {
            return [
                ...projectTitle.map(line => colorful(line, 'blue', true)),
            
                `\n半自动 AI，调用指定房间 help 方法来查看更详细的帮助信息 (如：${colorful('Game.rooms.W1N1.help', 'yellow')}())。在 ${colorful('Link, Factory, Terminal, PowerSpawn, Observer', 'yellow')} 对象实例上也包含对应的 help 方法。`,
            
                '\n—— [全局指令] ————————',
                createConst('查看资源常量', 'res'),
                createConst('移除所有禁止通行点位', 'clearpos'),
                createConst('查看所有 powerSpawn 的工作状态', 'ps'),
                createConst('查看商品生产线状态', 'comm'),
                createConst('列出所有路径缓存', 'route'),
                createConst('向指定旗帜发射核弹（需二次确认）', 'nuker'),
                '\n—— [全局方法] ————————',
                createHelp([
                    {
                        title: '获取游戏对象（Game.getObjectById 别名）',
                        params: [
                            { name: 'id', desc: '要查询的对象 id' }
                        ],
                        functionName: 'get'
                    },
                    {
                        title: '追加订单容量（Game.market.extendOrder 别名）',
                        params: [
                            { name: 'orderId', desc: '订单的 id' },
                            { name: 'amount', desc: '要追加的数量' }
                        ],
                        functionName: 'orderExtend'
                    },
                    {
                        title: '查询指定资源的房间分布',
                        params: [
                            { name: 'resourceName', desc: '要查询的资源名' }
                        ],
                        functionName: 'seeres'
                    },
                    {
                        title: '运行自动选址',
                        params: [
                            { name: 'roomName', desc: '要搜索的房间' }
                        ],
                        functionName: 'base'
                    },
                    {
                        title: '全局发送资源',
                        params: [
                            { name: 'roomName', desc: '要发送到的房间名' },
                            { name: 'resourceType', desc: '资源类型' },
                            { name: 'amount', desc: '发送数量' },
                        ],
                        functionName: 'give'
                    },
                    {
                        title: '欢呼',
                        params: [
                            { name: 'content', desc: '欢呼内容' },
                            { name: 'toPublic', desc: '[可选] 其他人是否可见，默认为 true' },
                        ],
                        functionName: 'hail'
                    }
                ]),
                '—— [全局模块] ————————',
                createHelp([
                    {
                        title: '白名单',
                        functionName: 'whitelist.help'
                    },
                    {
                        title: '房间绕过',
                        functionName: 'bypass.help'
                    },
                    {
                        title: '掠夺配置',
                        functionName: 'reive.help'
                    }
                ])
            ].join('\n')
        }
    },
    // 展示当前的全局路径缓存
    {
        alias: 'route',
        exec: function(): string {
            if (!global.routeCache) {
                global.routeCache = {}
                return `暂无路径缓存`
            }

            const logs = Object.keys(global.routeCache).map(routeKey => {
                return `[${routeKey.split(' ').join(' > ')}] ${global.routeCache[routeKey]}`
            })

            if (logs.length > 0) {
                logs.unshift(`当前共缓存路径 ${Object.keys(global.routeCache).length} 条`)
            }
            else return `暂无路径缓存`

            return logs.join('\n')
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
    },
    // 移除过期旗帜
    { alias: 'clearflag', exec: clearFlag },
    // 查看当前启用的 powerSpawn 工作状态
    {
        alias: 'ps',
        exec: function(): string {
            if (!Memory.psRooms || Memory.psRooms.length <= 0) return `没有正在工作的 powerSpawn，在 powerSpawn 对象实例上执行 .on() 方法来进行激活。`
            // 下面遍历是会把正常的房间名放在这里面
            const workingPowerSpawn = []

            // 遍历保存的所有房间，统计 ps 状态
            const stats = Memory.psRooms.map(roomName => {
                const room = Game.rooms[roomName]
                if (!room || !room.powerSpawn) return `[${roomName}] 无法访问该房间或该房间中的 powerSpawn，已移除。请重新尝试对该 powerSpawn 执行 .on()`
                workingPowerSpawn.push(roomName)

                return room.powerSpawn.stats()
            }).join('\n')

            // 更新可用的房间名
            Memory.psRooms = workingPowerSpawn
            return stats
        }
    },
    // 统计当前所有房间的存储状态
    {
        alias: 'storage',
        exec: function(): string {
            // 建筑容量在小于如下值时将会变色
            const colorLevel = {
                [STRUCTURE_TERMINAL]: { warning: 60000, danger: 30000 },
                [STRUCTURE_STORAGE]: { warning: 150000, danger: 50000 }
            }

            /**
             * 给数值添加颜色
             * 
             * @param capacity 要添加颜色的容量数值
             * @param warningLimit 报警的颜色等级
             */
            const addColor = (capacity: number, structureType: STRUCTURE_TERMINAL | STRUCTURE_STORAGE): string => {
                if (!capacity) return colorful('无法访问', 'red')
                return capacity > colorLevel[structureType].warning ? colorful(capacity.toString(), 'green') : 
                    capacity > colorLevel[structureType].danger ? colorful(capacity.toString(), 'yellow') : colorful(capacity.toString(), 'red')
            }

            const logs = [
                `剩余容量/总容量 [storage 报警限制] ${colorful(colorLevel[STRUCTURE_STORAGE].warning.toString(), 'yellow')} ${colorful(colorLevel[STRUCTURE_STORAGE].danger.toString(), 'red')} [terminal 报警限制] ${colorful(colorLevel[STRUCTURE_TERMINAL].warning.toString(), 'yellow')} ${colorful(colorLevel[STRUCTURE_TERMINAL].danger.toString(), 'red')}`,
                '',
                ...Object.values(Game.rooms).map(room => {
                    // 如果两者都没有或者房间无法被控制就不显示
                    if ((!room.storage && !room.terminal) || !room.controller) return false
    
                    let log = `[${room.name}] `
                    if (room.storage) log += `STORAGE: ${addColor(room.storage.store.getFreeCapacity(), STRUCTURE_STORAGE)}/${room.storage.store.getCapacity() || '无法访问'} `
                    else log += 'STORAGE: X '
    
                    if (room.terminal) log += `TERMINAL: ${addColor(room.terminal.store.getFreeCapacity(), STRUCTURE_TERMINAL)}/${room.terminal.store.getCapacity() || '无法访问'} `
                    else log += 'TERMINAL: X '
    
                    return log
                }).filter(log => log)
            ]

            return logs.join('\n')
        }
    },
    {
        alias: 'nuker',
        exec: function(): string {
            // 在 flag 中搜索的旗帜关键字
            const TARGET_FLAGE_NAME = 'nuker'
            let logs = []

            // 第一次执行
            if (!Memory.nukerLock) {
                const nukerDirective = {}
                // 搜索目标
                const targetFlags = Object.keys(Game.flags).filter(name => name.includes(TARGET_FLAGE_NAME))
                if (targetFlags.length <= 0) return `未找到目标，请新建名称包含 nuker 的旗帜`
                // 搜索所有核弹
                let hasNukerRoom = Object.values(Game.rooms).filter(room => room.nuker && 
                    room.nuker.store[RESOURCE_ENERGY] >= NUKER_ENERGY_CAPACITY && 
                    room.nuker.store[RESOURCE_GHODIUM] >= NUKER_GHODIUM_CAPACITY).map(room => room.name)
                if (hasNukerRoom.length <= 0) return `未找到 nuker，请确保有装填完成的 nuker`
                
                logs.push(`[打击目标] ${targetFlags.join(' ')}`)
                logs.push(`[发射房间] ${hasNukerRoom.join(' ')}`)

                // 遍历所有目标，找到发射源
                for (const target of targetFlags) {
                    const targetRoomName = Game.flags[target].pos.roomName
                    let sourceRoomName: string

                    // 遍历查找发射源
                    for (const nukerRoom of hasNukerRoom) {
                        if (Game.map.getRoomLinearDistance(targetRoomName, nukerRoom) <= 10) {
                            sourceRoomName = nukerRoom
                            break
                        }
                    }

                    if (sourceRoomName) {
                        // 加入指令表
                        nukerDirective[sourceRoomName] = target
                        // 从发射源中移除
                        hasNukerRoom = _.difference(hasNukerRoom, [ sourceRoomName ])
                    }
                    else logs.push(`未找到适合攻击 ${target} 的发射点 - 距离过远`)
                }

                // 写入内存
                Memory.nukerLock = true
                Memory.nukerDirective = nukerDirective

                logs.push('\n规划的打击指令如下，请确认：')
                logs.push(...Object.keys(nukerDirective).map(source => {
                    const targetFlag = Game.flags[nukerDirective[source]]
                    return `${source} > ${nukerDirective[source]} [${targetFlag.pos.roomName} ${targetFlag.pos.x}/${targetFlag.pos.y}]`
                }))
                logs.push(`\n确认发射请重新键入 ${colorful('nuker', 'red')}，取消发射请键入 ${colorful('cancelnuker', 'yellow')}`)
            }
            // 第二次执行
            else {
                // 确保所有核弹都就绪了
                const hasNotReady = Object.keys(Memory.nukerDirective).find(roomName => {
                    const fireRoom = Game.rooms[roomName]

                    return !fireRoom || !fireRoom.nuker ||
                        fireRoom.nuker.store[RESOURCE_ENERGY] < NUKER_ENERGY_CAPACITY ||
                        fireRoom.nuker.store[RESOURCE_GHODIUM] < NUKER_GHODIUM_CAPACITY
                })

                // 如果有未准备就绪的 nuker
                if (hasNotReady) {
                    delete Memory.nukerLock
                    delete Memory.nukerDirective
                    return `存在 Nuker 未装填完成，请执行 nuker 命令重新规划`
                }

                // 遍历执行所有发射指令
                for (const fireRoomName in Memory.nukerDirective) {
                    // 获取发射房间及落点旗帜
                    const fireRoom = Game.rooms[fireRoomName]
                    const targetFlag = Game.flags[Memory.nukerDirective[fireRoomName]]
                    if (!targetFlag) return `${Game.flags[Memory.nukerDirective[fireRoomName]]} 旗帜不存在，该指令已跳过`

                    const actionResult = fireRoom.nuker.launchNuke(targetFlag.pos)

                    // 发射完成后才会移除旗帜
                    if (actionResult === OK) {
                        logs.push(`${fireRoomName} 已发射，打击目标 ${Memory.nukerDirective[fireRoomName]}`)
                        targetFlag.remove()
                    }
                    else logs.push(`${fireRoomName} launchNuke 错误码 ${actionResult}, 旗帜 ${targetFlag.name} 已保留`)
                }

                delete Memory.nukerLock
                delete Memory.nukerDirective
            }

            return logs.join('\n')
        }
    },
    {
        alias: 'cancelnuker',
        exec: function(): string {
            if (!Memory.nukerLock) return `没有已存在的 nuker 发射指令`

            delete Memory.nukerLock
            delete Memory.nukerDirective
            return `nuker 发射指令已取消`
        }
    },

    /**
     * 把房间挂载到全局
     * 来方便控制台操作，在访问时会实时的获取房间对象
     * 注意：仅会挂载 Memory.rooms 里有的房间
     */
    ...Object.keys(Memory.rooms || {}).map(roomName => ({
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
    get(id: string): any {
        return Game.getObjectById(id)
    },

    /**
     * Game.market.extendOrder 的别名
     * 
     * @param orderId 订单的 id
     * @param amount 要追加的数量
     */
    orderExtend(orderId: string, amount: number) {
        const actionResult = Game.market.extendOrder(orderId, amount)

        let returnString = ''
        if (actionResult === OK) returnString = '订单追加成功'
        else returnString = `订单追加失败，错误码 ${returnString}`

        return returnString
    },

    /**
     * 查询指定资源在各个房间中的数量
     * 
     * @param resourceName 要查询的资源名
     */
    seeres(resourceName: ResourceConstant): string {
        // 根据资源不同选择不同的查询目标
        const source = resourceName === RESOURCE_ENERGY ? STRUCTURE_STORAGE : STRUCTURE_TERMINAL
        let total = 0

        let log = `${resourceName} 的分布如下：\n`
        // 遍历所有房间并检查对应的存储建筑
        log += Object.values(Game.rooms).map(room => {
            // 统计数量
            const amount = room[source] ? (room[source].store[resourceName] || 0) : 0
            total += amount

            // 如果有就列出显示
            if (room[source] && amount > 0) return `${room.name} => ${amount}`
            else return false
        }).filter(res => res).join('\n')

        log += `\n共计: ${total}`
        return log
    },

    /**
     * 所有 creep 欢呼
     * 
     * @param content 要欢呼的内容
     * @param toPublic 是否对其他人可见
     */
    hail(content: string = '', toPublic: boolean = true): string {
        Object.values(Game.creeps).forEach(creep => creep.say(`${content}!`, toPublic))

        return content ? content : 'yeah!'
    },

    /**
     * 对指定房间运行基地查找
     * 
     * @param roomName 房间名
     */
    base(roomName: string): string {
        const targetPos = findBaseCenterPos(roomName)
        const firstSpawn = baseLayout[1][STRUCTURE_SPAWN][0]

        if (targetPos.length <= 0) return `[${roomName}] 未找到合适的中心点，请确保该房间中有大于 11*11 的空地。`
        
        const logs = [`[${roomName}] 找到如下适合作为基地中心的点位:`]
        logs.push(...targetPos.map(pos => `[基地中心] ${pos.x} ${pos.y} [spawn 位置] ${pos.x + firstSpawn[0]}, ${pos.y + firstSpawn[1]}`))

        return logs.join('\n')
    },

    /**
     * 全局发送资源到指定房间
     * 会检查哪个房间包含指定资源，并调用 Room.giver 方法发送资源
     * 
     * @param roomName 房间名
     * @param resourceType 资源类型
     * @param amount 发送数量
     */
    give(roomName: string, resourceType: ResourceConstant, amount: number): string {
        const logs: string[] = [ '已启动全局资源调配' ]
        let sendAmount = 0

        // 遍历所有房间进行查找
        for (const currentRoomName in Game.rooms) {
            if (amount - sendAmount <= 0) break
            // 没有对应资源就下个房间
            const room = Game.rooms[currentRoomName]
            if (!room.terminal || !room.terminal.my || room.terminal.store[resourceType] <= 0) continue

            // 计算本房间应发送的数量（不超的情况下直接发完）
            const roomAmount = Math.min(room.terminal.store[resourceType], amount - sendAmount)

            // 发送资源并记录结果
            logs.push(`[${currentRoomName}]${room.giver(roomName, resourceType, roomAmount)}`)
            sendAmount += roomAmount
        }

        logs.push(`调配完成，向 ${roomName} 发送 ${resourceType} 共计 ${sendAmount}`)

        return logs.join('\n')
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

            // 移除重复的房间
            if (roomNames.length <= 0) delete Memory.bypassRooms
            else Memory.bypassRooms = _.difference(Memory.bypassRooms, roomNames)

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
                        { name: '...roomNames', desc: '[可选] 要移除的房间名列表，置空来移除所有' }
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

    /**
     * 掠夺配置 api
     * 用于让 reiver 搬运指定的资源，该列表不存在时将默认搬运所有的资源
     */
    reive: {
        /**
         * 添加要掠夺的资源
         * 
         * @param resources 要掠夺的资源
         */
        add(...resources: ResourceConstant[]): string {
            if (!Memory.reiveList) Memory.reiveList = []

            // 确保新增的资源不会重复
            Memory.reiveList = _.uniq([ ...Memory.reiveList, ...resources])

            return `[reiver] 添加成功，${this.show()}`
        },

        /**
         * 移除要掠夺的资源
         * 参数为空时移除所有
         * 
         * @param resources 要移除的掠夺资源
         */
        remove(...resources: ResourceConstant[]): string {
            if (!Memory.reiveList) Memory.reiveList = []

            // 更新列表
            if (resources.length <= 0) delete Memory.reiveList
            else Memory.reiveList = _.difference(Memory.reiveList, resources)

            return `[bypass] 移除成功，${this.show()}`
        },

        /**
         * 显示所有掠夺资源
         */
        show(): string {
            if (!Memory.reiveList || Memory.reiveList.length <= 0) return `暂无特指，将掠夺所有资源`
            return `当前仅会掠夺如下资源：${Memory.reiveList.join(' ')}`
        },

        /**
         * 帮助信息
         */
        help() {
            return createHelp([
                {
                    title: '添加要掠夺的资源',
                    params: [
                        { name: '...resources', desc: '要掠夺的资源' }
                    ],
                    functionName: 'add'
                },
                {
                    title: '移除要掠夺的资源',
                    params: [
                        { name: '...resources', desc: '[可选] 不再掠夺的资源，置空来移除所有' }
                    ],
                    functionName: 'remove'
                },
                {
                    title: '显示所有掠夺资源',
                    functionName: 'show'
                }
            ])
        }
    },

    // 将 creepApi 挂载到全局方便手动发布或取消 creep
    creepApi
}

/**
 * 帮助文档中的标题
 */
const projectTitle = [
    String.raw`        __  __      ____  ______      __    __         _____                               `,
    String.raw`       / / / /___  / __ \/ ____/___  / /___/ /_  __   / ___/_____________  ___  ____  _____`,
    String.raw`      / /_/ / __ \/ /_/ / / __/ __ \/ / __  / / / /   \__ \/ ___/ ___/ _ \/ _ \/ __ \/ ___/`,
    String.raw`     / __  / /_/ / ____/ /_/ / /_/ / / /_/ / /_/ /   ___/ / /__/ /  /  __/  __/ /_/ (__  ) `,
    String.raw`    /_/ /_/\____/_/    \____/\____/_/\__,_/\__, /   /____/\___/_/   \___/\___/ .___/____/  `,
    String.raw`                                          /____/                            /_/              openSource at github - ${createLink('hopgoldy/screeps-ai', 'https://github.com/HoPGoldy/my-screeps-ai')}`
]

// 资源常量控制台帮助
const resourcesHelp: string = `
${createConst('O', 'RESOURCE_OXYGEN')}              ${createConst('H', 'RESOURCE_HYDROGEN')}         ${createConst('U', 'RESOURCE_UTRIUM')}             ${createConst('X', 'RESOURCE_CATALYST')}
${createConst('压缩O', 'RESOURCE_OXIDANT')}         ${createConst('压缩H', 'RESOURCE_REDUCTANT')}     ${createConst('压缩U', 'RESOURCE_UTRIUM_BAR')}     ${createConst('压缩X', 'RESOURCE_PURIFIER')}
${createConst('L', 'RESOURCE_LEMERGIUM')}           ${createConst('K', 'RESOURCE_KEANIUM')}          ${createConst('Z', 'RESOURCE_ZYNTHIUM')}           ${createConst('G', 'RESOURCE_GHODIUM')} 
${createConst('压缩L', 'RESOURCE_LEMERGIUM_BAR')}   ${createConst('压缩K', 'RESOURCE_KEANIUM_BAR')}   ${createConst('压缩Z', 'RESOURCE_ZYNTHIUM_BAR')}   ${createConst('压缩G', 'RESOURCE_GHODIUM_MELT')}

${createConst('TOUGH强化', 'RESOURCE_CATALYZED_GHODIUM_ALKALIDE')}   ${createConst('RANGE_ATTACK强化', 'RESOURCE_CATALYZED_KEANIUM_ALKALIDE')}
${createConst('MOVE强化', 'RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE')}   ${createConst('HEAL强化', 'RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE')}
`

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

    const workStats = memory.pause ? colorful('暂停中', 'yellow') :
        memory.sleep ? colorful(`${memory.sleepReason} 休眠中 剩余${memory.sleep - Game.time}t`, 'yellow') : colorful('工作中', 'green')

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
            return factoryTopTargets[type][memory.level].map<string>(res => `${res}*${room.terminal.store[res]}`)
        }))
        logs.push('[产物数量]', ...topResource)
    }
    else logs.push('异常!未发现终端')

    // 组装统计信息
    return logs.join(' ')
}