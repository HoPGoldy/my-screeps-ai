import { stateScanInterval } from './setting'

// 路径名到颜色的对应列表
const pathMap: IPathMap = {
    default: '#ffffff',
    havest: '#CCFF99',
    upgrade: '#99CCFF',
    build: '#FFCC99',
    repair: '#000099',
    attack: '#DC143C', // 猩红
    claimer: 'Indigo' // 靛青
}

/**
 * 通过路径名称获取 visualizePathStyle
 * 
 * @param pathName 路径的名称
 * @returns 包含可视化路径的对象
 */
export function getPath (pathName: string='default'): MoveToOpts {
    const pathColor: string = (pathName in pathMap) ? 
        pathMap[pathName] : 
        pathMap['default']
    
    return {
        visualizePathStyle: {
            stroke: pathColor
        }
    }
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
 * @param color 要添加的颜色
 */
export function colorful(content: string, color: string): string {
    return `<text style="color: ${color}">${content}</text>`
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
        const title = colorful(func.title, '#6b9955')
        // 参数介绍
        const param = func.params ? 
            func.params.map(param => `  - ${colorful(param.name, '#8dc5e3')}: ${colorful(param.desc, '#6b9955')}`).join('\n') : ''
        // 函数示例中的参数
        const paramInFunc = func.params ? 
            func.params.map(param => colorful(param.name, '#8dc5e3')).join(', ') : ''
        // 函数示例
        const functionName = `${colorful(func.functionName, '#c5c599')}(${paramInFunc})`

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
    return `${colorful(name, '#6b9955')} ${colorful(constant, '#8dc5e3')}`
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

    if (!Memory.stats) Memory.stats = {}
    
    // 统计 GCL / GPL 的升级百分比和等级
    Memory.stats.gcl = (Game.gcl.progress / Game.gcl.progressTotal) * 100,
    Memory.stats.gclLevel = Game.gcl.level,
    Memory.stats.gpl = (Game.gpl.progress / Game.gpl.progressTotal) * 100,
    Memory.stats.gplLevel = Game.gpl.level,
    // CPU 的当前使用量
    Memory.stats.cpu = Game.cpu.getUsed(),
    // bucket 当前剩余量
    Memory.stats.bucket = Game.cpu.bucket
}