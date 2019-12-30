import { creepConfigs } from './config'
// import { shareSetting } from './setting'

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
    return [].concat(bodys)
}

/**
 * creep 数量控制器
 * 
 * 通过检查死亡 creep 的记忆来确定哪些 creep 需要重生
 * 此函数可以同时清除死去 creep 的内存
 */
export function creepNumberController (): void {
    // if (Game.time % 20) return

    for (const name in Memory.creeps) {
        // 如果 creep 已经凉了
        if (!Game.creeps[name]) {
            const role: string = Memory.creeps[name].role
            // 获取配置项
            const creepConfig: ICreepConfig = creepConfigs[role]
            if (!creepConfig) {
                console.log(`死亡 ${name} 未找到对应 creepConfig, 已删除`)
                delete Memory.creeps[name]
                return
            }

            // 检查指定的 spawn 中有没有它的生成任务
            const spawn = Game.spawns[creepConfig.spawn]
            if (!spawn) {
                console.log(`死亡 ${name} 未找到 ${creepConfig.spawn}`)
                return
            }
            // 没有的话加入生成
            if (!spawn.hasTask(role)) {
                spawn.addTask(role)
                // console.log(`将 ${role} 加入 ${creepConfig.spawn} 生成队列`)
            }
            // 有的话删除过期内存
            else {
                delete Memory.creeps[name]
                // console.log('清除死去 creep 记忆', name)
            }
        }
    }
}

/**
 * 执行 Hash Map 中子元素对象的 work 方法
 * 
 * @param hashMap 游戏对象的 hash map。如 Game.creeps、Game.spawns 等
 */
export function doing(hashMap: object): void {
    Object.values(hashMap).forEach(item => {
        // let cost1: number
        // let cost2: number
        // if (item.work && item.structureType) cost1 = Game.cpu.getUsed()

        if (item.work) item.work()
         
        // if (item.work && item.structureType) {
        //     cost2 = Game.cpu.getUsed()
        //     console.log(`建筑 ${item} 消耗 cpu ${cost2 - cost1}`)
        // }
    })
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