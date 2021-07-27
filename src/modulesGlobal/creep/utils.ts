import { CreepData } from "@/role/types/role"
import { Color, colorful } from "../console/utils"

/**
 * creep 移除配置项
 */
export interface RemoveCreepOptions {
    /**
     * 【可选】是否批量移除，默认只会移除匹配到的第一个 creep
     */
    batch: boolean
    /**
     * 【可选】是否立刻移除，默认会在 creep 自然老死后移除
     */
    immediate: boolean
}

/**
 * 移除指定 creep
 * 会移除名字中包含第一个参数的 creep
 * 
 * @param creepNamePart 要移除的 creep 名称部分
 * @param opts 移除配置项
 */
export const removeCreep = function (creepNamePart: string, opts: Partial<RemoveCreepOptions> = {}) {
    const options: RemoveCreepOptions = _.defaults(opts, { batch: false, immediate: false })

    const removeFunc = (creepName: string) => {
        if (!creepName.includes(creepNamePart)) return false

        if (options.immediate) {
            // 要删除内存再杀掉，不然会重新孵化
            delete Memory.creeps[creepName]
            Game.creeps[creepName]!.suicide()
        }
        else Memory.creeps[creepName].cantRespawn = true

        return true
    }

    // 注意这里是从 memory 中去找
    // 因为如果运行时 creep 正处在死了但还没有被 creep 数量控制模块发现的时候
    // Game.creeps 里是找不到他的，就会出现删除了他但是几 tick 之后又重新孵化了的问题
    const creeps = Object.keys(Memory.creeps || {})

    // 如果指定了批量的话就遍历所有 creep
    if (options.batch) creeps.forEach(removeFunc)
    // 否则只移除匹配到的第一个
    else creeps.find(removeFunc)
}

/**
 * 格式化输出所有 creep 配置
 */
export const showCreep = function (): string {
    const allCreeps = Object.values(Game.creeps)
    if (allCreeps.length === 0) return `暂无 creep 配置`

    // 将 creep 的配置进行格式化
    let format: { [roomName: string]: string[] } = {}

    // 遍历所有配置项并格式化
    for (const { name, spawning, ticksToLive, memory } of allCreeps) {
        // 兜底，创建输出中的房间标题
        if (!(memory.spawnRoom in format)) format[memory.spawnRoom] = [ `${memory.spawnRoom} 下属 creep：` ]
        
        // 检查该单位的存活状态
        let liveStats: string = ''
        if (spawning) liveStats = colorful('孵化中', Color.Yellow)
        else liveStats = `${colorful('存活', Color.Green)} 剩余生命 ${ticksToLive}`

        format[memory.spawnRoom].push(`  - [${name}] [角色] ${memory.role} [当前状态] ${liveStats}`)
    }

    let logs = []
    Object.values(format).forEach(roomCreeps => logs.push(...roomCreeps))
    logs.unshift(`当前共有 creep  ${allCreeps.length} 只`)
    return logs.join('\n')
}

/**
 * 是否存在指定 creep
 * 
 * @param creepName 要检查是否存在的 creep 名称
 */
export const hasCreep = function (creepName: string): boolean {
    return creepName in Game.creeps
}

/**
 * 更新 creep data
 * 由于下一代 creep 的初始 data 数据继承自上一代 creep，所以在需要更新 data 时可以使用这个方法
 * 
 * @param creepName 要更新 data 的 creep 名称
 * @param newData 新的 data
 */
export const updateCreepData = function (creepName: string, newData: CreepData): OK | ERR_NOT_FOUND {
    if (!(creepName in Game.creeps)) return ERR_NOT_FOUND
    Game.creeps[creepName].memory.data = newData
}
