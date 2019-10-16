import { globalExtension } from './mount.global'
import { creepConfigs } from './config'

// 路径名到颜色的对应列表
const pathMap: IPathMap = {
    default: '#ffffff',
    havest: '#CCFF99',
    upgrade: '#99CCFF',
    build: '#FFCC99',
    repair: '#000099',
    attack: '#DC143C', // 猩红
    claimer: 'Indigo' //靛青
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
 * 死亡 creep 记忆清除
 */
export function clearDiedCreep (): boolean {
    for(const name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name]
            console.log('清除死去蠕虫记忆', name)
        }
    }
    return true
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
            console.log(name, '已经死了')
            const role: string = Memory.creeps[name].role
            // 获取配置项
            const creepConfig: ICreepConfig = creepConfigs[role]
            if (!creepConfig) {
                console.log(`死亡 ${name} 未找到指定的 creepConfig 已删除`)
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
                console.log(`将 ${role} 加入 ${creepConfig.spawn} 生成队列，当前排队位置: ${spawn.addTask(role)}`)
            }
            // 有的话删除过期内存
            else {
                delete Memory.creeps[name]
                console.log('清除死去 creep 记忆', name)
            }
        }
    }
}

/**
 * 执行 Hash Map 中子元素对象的 work 方法
 * 
 * @param map 游戏对象的 hash map。如 Game.creeps、Game.spawns 等
 */
export function doing(map: object): void {
    for (const itemName in map) {
        const item = map[itemName]

        if (item.work) item.work()
    }
}