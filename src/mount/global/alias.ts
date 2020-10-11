import { colorful, clearFlag, createRoomLink, createConst, createLink } from 'utils'
import { factoryTopTargets } from 'setting'
import { createHelp } from 'modules/help'
import { routeCache } from 'modules/move'

/**
 * 全局拓展的别名
 * 使用别名来方便在控制台执行方法
 * 
 * @property {string} alias 别名
 * @property {function} exec 执行别名时触发的操作
 */
export default [
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
            
                `\n半自动 AI，调用指定房间 help 方法来查看更详细的帮助信息 (如：${colorful('Game.rooms.W1N1.help', 'yellow')}())。在 ${colorful('Link, Factory, Terminal, PowerSpawn, Observer', 'yellow')} 对象实例上也包含对应的 help 方法。\n`,

                createHelp(
                    {
                        name: '全局指令',
                        describe: '直接输入就可以执行，不需要加 ()',
                        api: [
                            {
                                title: '查看资源常量',
                                commandType: true,
                                functionName: 'res'
                            },
                            {
                                title: '移除所有禁止通行点位',
                                describe: '当发现有 creep 仿佛被“空气墙”卡住时请执行该指令',
                                commandType: true,
                                functionName: 'clearpos'
                            },
                            {
                                title: '查看 powerSpawn 状态汇总',
                                commandType: true,
                                functionName: 'ps'
                            },
                            {
                                title: '查看 observer 状态汇总',
                                commandType: true,
                                functionName: 'ob'
                            },
                            {
                                title: '查看商品生产线',
                                commandType: true,
                                functionName: 'comm'
                            },
                            {
                                title: '列出所有路径缓存',
                                describe: '路径缓存是全局的，会在 global 重置时清空',
                                commandType: true,
                                functionName: 'route'
                            },
                            {
                                title: '发射核弹',
                                describe: '向指定旗帜发射核弹，直接输入该命令来了解更多信息',
                                commandType: true,
                                functionName: 'nuker'
                            }
                        ]
                    },
                    {
                        name: '全局方法',
                        describe: '定义在全局的函数，优化手操体验',
                        api: [
                            {
                                title: '获取游戏对象',
                                describe: 'Game.getObjectById 方法的别名',
                                params: [
                                    { name: 'id', desc: '要查询的对象 id' }
                                ],
                                functionName: 'get'
                            },
                            {
                                title: '追加订单容量',
                                describe: 'Game.market.extendOrder 方法的别名',
                                params: [
                                    { name: 'orderId', desc: '订单的 id' },
                                    { name: 'amount', desc: '要追加的数量' }
                                ],
                                functionName: 'orderExtend'
                            },
                            {
                                title: '查询指定资源',
                                describe: '全局搜索资源的数量以及所处房间',
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
                                describe: '会遍历所有房间搜索资源并发送直到总量到达指定数量',
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
                        ]
                    },
                    {
                        name: '全局模块',
                        describe: '可以全局访问的模块，访问其 help 方法来了解更多信息。',
                        api: [
                            {
                                title: '白名单',
                                describe: '查看白名单帮助信息',
                                functionName: 'whitelist.help'
                            },
                            {
                                title: '房间绕过',
                                describe: '查看房间绕过帮助信息',
                                functionName: 'bypass.help'
                            },
                            {
                                title: '掠夺配置',
                                describe: '查看掠夺配置帮助信息',
                                functionName: 'reive.help'
                            }
                        ]
                    }
                )
            ].join('\n')
        }
    },
    // 展示当前的全局路径缓存
    {
        alias: 'route',
        exec: function(): string {
            const routeNames = Object.keys(routeCache)
            if (routeNames.length <= 0) return `暂无路径缓存`

            const logs = routeNames.map(routeKey => {
                return `[${routeKey.split(' ').join(' > ')}] ${routeCache[routeKey]}`
            })

            if (logs.length > 0) {
                logs.unshift(`当前共缓存路径 ${routeNames.length} 条`)
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
                if (!room || !room.powerSpawn) return `${colorful('●', 'red', true)} ${createRoomLink(roomName)} 无法访问该房间中的 powerSpawn，已移除。`
                workingPowerSpawn.push(roomName)

                return room.powerSpawn.stats()
            }).join('\n')

            // 更新可用的房间名
            Memory.psRooms = workingPowerSpawn
            return stats
        }
    },
    {
        alias: 'ob',
        exec: function(): string {
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
            }).filter(stats => stats).join('\n')

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