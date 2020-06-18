import { stateScanInterval, colors } from './setting'

/**
* 获取指定方向的相反方向
* 
* @param direction 目标方向
*/
export function getOppositeDirection(direction: DirectionConstant): DirectionConstant {
   return <DirectionConstant>((direction + 3) % 8 + 1)
}

/**
 * 根据身体配置生成完成的身体数组
 * cpu 消耗: 0.028 左右
 * 
 * @param bodySet 身体部件配置对象
 */
export function calcBodyPart(bodySet: BodySet): BodyPartConstant[] {
    // 把身体配置项拓展成如下形式的二维数组
    // [ [ TOUGH ], [ WORK, WORK ], [ MOVE, MOVE, MOVE ] ]
    const bodys = Object.keys(bodySet).map(type => Array(bodySet[type]).fill(type))
    // 把二维数组展平
    return [].concat(...bodys)
}

/**
 * 执行 Hash Map 中子元素对象的 work 方法
 * 
 * @param hashMap 游戏对象的 hash map。如 Game.creeps、Game.spawns 等
 * @param showCpu [可选] 传入指定字符串来启动该 Map 的数量统计
 */
export function doing(hashMap: object, showCpu: string = ''): void {
    let startCost = Game.cpu.getUsed()

    // 遍历执行 work
    Object.values(hashMap).forEach(item => {
        if (item.work) item.work()
    })

    // 如果有需求的话就显示 cpu 消耗
    if (showCpu) console.log(`[${showCpu}] 消耗 ${Game.cpu.getUsed() - startCost}`)
}

/**
 * 给指定文本添加颜色
 * 
 * @param content 要添加颜色的文本
 * @param colorName 要添加的颜色常量字符串
 */
export function colorful(content: string, colorName: Colors): string {
    return `<text style="color: ${colors[colorName]}">${content}</text>`
}

/**
 * 给函数的显示添加一点小细节
 * 只会用在各种 help 方法中
 * 
 * @param functionInfo 函数的信息
 */
export function createHelp(functionInfo: IFunctionDescribe[]): string {
    const functionList = functionInfo.map(func => {
        // 标题
        const title = colorful(func.title, 'green')
        // 参数介绍
        const param = func.params ? 
            func.params.map(param => `  - ${colorful(param.name, 'blue')}: ${colorful(param.desc, 'green')}`).join('\n') : ''
        // 函数示例中的参数
        const paramInFunc = func.params ? 
            func.params.map(param => colorful(param.name, 'blue')).join(', ') : ''
        // 函数示例
        const functionName = `${colorful(func.functionName, 'yellow')}(${paramInFunc})`

        return func.params ? `${title}\n${param}\n${functionName}\n` : `${title}\n${functionName}\n`
    })
    
    return functionList.join('\n')
}

/**
 * 快捷生成单个常量帮助
 * 
 * @param name 常量简称
 * @param constant 常量名
 */
function createConst(name: string, constant: string): string {
    return `${colorful(name, 'green')} ${colorful(constant, 'blue')}`
}

// 资源常量控制台帮助
export const resourcesHelp: string = `
${createConst('O', 'RESOURCE_OXYGEN')}              ${createConst('H', 'RESOURCE_HYDROGEN')}         ${createConst('U', 'RESOURCE_UTRIUM')}             ${createConst('X', 'RESOURCE_CATALYST')}
${createConst('压缩O', 'RESOURCE_OXIDANT')}         ${createConst('压缩H', 'RESOURCE_REDUCTANT')}     ${createConst('压缩U', 'RESOURCE_UTRIUM_BAR')}     ${createConst('压缩X', 'RESOURCE_PURIFIER')}
${createConst('L', 'RESOURCE_LEMERGIUM')}           ${createConst('K', 'RESOURCE_KEANIUM')}          ${createConst('Z', 'RESOURCE_ZYNTHIUM')}           ${createConst('G', 'RESOURCE_GHODIUM')} 
${createConst('压缩L', 'RESOURCE_LEMERGIUM_BAR')}   ${createConst('压缩K', 'RESOURCE_KEANIUM_BAR')}   ${createConst('压缩Z', 'RESOURCE_ZYNTHIUM_BAR')}   ${createConst('压缩G', 'RESOURCE_GHODIUM_MELT')}

${createConst('TOUGH强化', 'RESOURCE_CATALYZED_GHODIUM_ALKALIDE')}   ${createConst('RANGE_ATTACK强化', 'RESOURCE_CATALYZED_KEANIUM_ALKALIDE')}
${createConst('MOVE强化', 'RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE')}   ${createConst('HEAL强化', 'RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE')}
`

/**
 * 全局统计信息扫描器
 * 负责搜集关于 cpu、memory、GCL、GPL 的相关信息
 * 详情见 ./doc/Grafana 统计信息.md
 */
export function stateScanner(): void {
    if (Game.time % stateScanInterval) return 

    if (!Memory.stats) Memory.stats = { rooms: {} }
    
    // 统计 GCL / GPL 的升级百分比和等级
    Memory.stats.gcl = (Game.gcl.progress / Game.gcl.progressTotal) * 100,
    Memory.stats.gclLevel = Game.gcl.level,
    Memory.stats.gpl = (Game.gpl.progress / Game.gpl.progressTotal) * 100,
    Memory.stats.gplLevel = Game.gpl.level,
    // CPU 的当前使用量
    Memory.stats.cpu = Game.cpu.getUsed(),
    // bucket 当前剩余量
    Memory.stats.bucket = Game.cpu.bucket
    // 统计剩余钱数
    Memory.stats.credit = Game.market.credits
}

/**
 * 全局帮助文档
 */
export const globalHelp = [
    colorful('HoPGoldy Screeps', 'blue'),
    colorful('半自动 AI，调用指定房间 help 方法来查看更详细的帮助信息（如：Game.rooms.W1N1.help()）。在 Link, Factory, Terminal, PowerSpawn, Observer 也包含对应的 help 方法。以下为全局方法：', 'green'),
    '——————————',
    createConst('查看资源常量', 'res'),
    createConst('移除所有禁止通行点位', 'clearpos'),
    createConst('查看商品生产线状态', 'comm'),
    createConst('列出所有路径缓存', 'route'),
    createConst('向指定旗帜发射核弹（需二次确认）', 'nuker'),
    '——————————',
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
        }
    ]),
    '——————————',
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

/**
 * 全局喊话
 */
export function globalSay(words: string[]) {
    if (!Memory.sayIndex) Memory.sayIndex = 0

    Object.values(Game.creeps).forEach(creep => creep.say(words[Memory.sayIndex], true))

    Memory.sayIndex = Memory.sayIndex + 1 >= words.length ? 0 : Memory.sayIndex + 1
}

/**
 * 移除过期的 flag 内存
 */
export function clearFlag(): string {
    let logs = [ '已清理过期旗帜:' ]
    for (const flagName in Memory.flags) {
        if (!Game.flags[flagName]) {
            delete Memory.flags[flagName]
            logs.push(flagName)
        }
    }

    return logs.join(' ')
}

/**
 * 判断是否为白名单玩家
 * 
 * @param creep 要检查的 creep
 * @returns 是否为白名单玩家
 */
export function whiteListFilter(creep) {
    if (!Memory.whiteList) return true
    // 加入白名单的玩家单位不会被攻击，但是会被记录
    if (creep.owner.username in Memory.whiteList) {
        Memory.whiteList[creep.owner.username] += 1
        return false
    }

    return true
}